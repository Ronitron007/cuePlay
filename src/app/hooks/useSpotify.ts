'use client';

import { useState, useEffect } from 'react';
import { AudioFile } from '../context/AppContext';

// Define the Spotify tokens type
export type SpotifyTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
} | null;

/**
 * Custom hook for managing Spotify integration
 * Handles authentication, token management, and data fetching from Spotify API
 */
export const useSpotify = () => {
  const [spotifyTokens, setSpotifyTokens] = useState<SpotifyTokens>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Generate a random string for state parameter during auth
  const generateRandomString = (length: number) => {
    const possible =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  };

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/spotify/check-auth');
        const data = await response.json();

        if (data.authenticated) {
          setIsAuthenticated(true);
          setSpotifyTokens({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
          });
        }
      } catch (error) {
        console.error('Failed to check authentication status:', error);
      }
    };

    checkAuth();
  }, []);

  /**
   * Handles the Spotify login process
   */
  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
    if (!clientId) {
      console.error('Spotify Client ID not found');
      return;
    }

    const redirectUri =
      typeof window !== 'undefined'
        ? `${window.location.origin}/api/spotify/callback`
        : '';
    const state = generateRandomString(16);
    const scope = 'user-read-private user-read-email';

    // Store state in localStorage to verify when callback returns
    localStorage.setItem('spotify_auth_state', state);

    const authUrl = new URL('https://accounts.spotify.com/authorize');
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('state', state);

    window.location.href = authUrl.toString();
  };

  /**
   * Handles logout from Spotify
   */
  const handleLogout = async () => {
    try {
      await fetch('/api/spotify/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setSpotifyTokens(null);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  /**
   * Fetches metadata from Spotify for a given audio file
   *
   * @param {AudioFile} file - The audio file to fetch metadata for
   * @returns {Promise<AudioFile>} The updated audio file with Spotify metadata
   */
  const fetchSpotifyMetadata = async (
    file: AudioFile
  ): Promise<AudioFile | null> => {
    if (!spotifyTokens) {
      console.error('Not authenticated with Spotify');
      return null;
    }

    setIsLoading(true);

    try {
      // Create a search query based on available metadata
      const editInfoSplit = (file?.metadata?.title || '').split('[');
      const titleSplit = editInfoSplit[0].split('(feat.');
      const title =
        titleSplit[0] +
        (editInfoSplit.length > 1
          ? ' - ' + editInfoSplit[1].replace(']', '')
          : '');
      const artist =
        (file?.metadata?.artist || '') +
        (titleSplit.length > 1 ? ', ' + titleSplit[1].replace(')', '') : '');
      let searchQuery = '';

      if (title && artist) {
        searchQuery = `track:${title} artist:${artist}`;
      } else if (title) {
        searchQuery = `track:${title}`;
      } else if (artist) {
        searchQuery = `artist:${artist}`;
      } else {
        // Try to extract info from filename
        const filename = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
        searchQuery = filename;
      }

      // Include original title and artist for similarity scoring
      const queryParams = new URLSearchParams({
        q: searchQuery,
      });

      if (title) queryParams.append('title', title);
      if (artist) queryParams.append('artist', artist);

      const response = await fetch(
        `/api/spotify/search?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch from Spotify');
      }

      const data = await response.json();
      let setTrack = false;
      let updatedFile = { ...file };

      if (data.tracks && data.tracks.items && data.tracks.items.length > 0) {
        // Get the best match
        const track = data.tracks.items[0];

        // Check if the match score is good enough (if available)
        const matchThreshold = 0.6; // Adjust this threshold as needed
        if (
          track.matchScore !== undefined &&
          track.matchScore < matchThreshold
        ) {
          // If we have multiple results, show a confirmation with the top match
          if (
            confirm(
              `Best match: "${track.name}" by ${track.artists
                .map((a: { name: string }) => a.name)
                .join(', ')}...`
            )
          ) {
            setTrack = true;
          } else {
            alert('No matching tracks found on Spotify');
            setIsLoading(false);
            return null;
          }
        } else {
          setTrack = true;
        }

        // Update the file with Spotify metadata
        if (setTrack) {
          // First update with basic track info
          updatedFile = {
            ...updatedFile,
            metadata: {
              ...updatedFile.metadata,
              title: track.name,
              artist: track.artists
                .map((a: { name: string }) => a.name)
                .join(', '),
              album: track.album.name,
              spotifyId: track.id,
              spotifyUri: track.uri,
              spotifyUrl: track.external_urls.spotify,
              spotifyAlbumArt:
                track.album.images[0]?.url || updatedFile.metadata?.picture,
              // Keep existing tempo if available
              tempo: updatedFile.metadata?.tempo || null,
            },
          };

          // Then fetch audio features
          try {
            const featuresResponse = await fetch(
              `/api/spotify/audio-features/${track.id}`
            );
            if (!featuresResponse.ok) {
              throw new Error('Failed to fetch audio features');
            }

            const features = await featuresResponse.json();

            // Update with audio features
            updatedFile = {
              ...updatedFile,
              metadata: {
                ...updatedFile.metadata,
                // Only override tempo if we don't already have it
                tempo:
                  updatedFile.metadata?.tempo || Math.round(features.tempo),
                key: features.key,
                mode: features.mode,
                timeSignature: features.time_signature,
                danceability: features.danceability,
                energy: features.energy,
                acousticness: features.acousticness,
                instrumentalness: features.instrumentalness,
                liveness: features.liveness,
                valence: features.valence,
              },
            };
          } catch (error) {
            console.error('Error fetching audio features:', error);
            // We already updated with basic info, so just log the error
          }
        }
      } else {
        alert('No matching tracks found on Spotify');
        setIsLoading(false);
        return null;
      }

      setIsLoading(false);
      return updatedFile;
    } catch (error) {
      console.error('Error fetching Spotify metadata:', error);
      alert('Error fetching Spotify metadata');
      setIsLoading(false);
      return null;
    }
  };

  return {
    spotifyTokens,
    isAuthenticated,
    isLoading,
    handleLogin,
    handleLogout,
    fetchSpotifyMetadata,
  };
};
