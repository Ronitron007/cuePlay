
import parser from 'better-cue-parser'

 const parseCue = (cueFileString: string) => {

  const cuesheet = parser.parse(cueFileString)
  return cuesheet
}


export default parseCue