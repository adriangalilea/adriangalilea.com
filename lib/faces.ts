// THE QUOTES' SERIF, MEASURED. The quote card turns a measure in characters into a width
// in pixels through the face's average character advance, and a still cannot measure
// text, so whoever names the face says how wide it runs. Left at the generic default a
// condensed face came out a third too small for its measure, a haiku in a corner of the
// frame.
//
// Tinos (`--font-quote`, app/layout.tsx; lib/fonts/Tinos-Regular.ttf for the still):
// measured with fontTools over English letter frequencies, spaces included. Re-measure if
// the face changes; never guess. Instrument Serif, the heading face, measured 0.34 and is
// not the quote face: a display serif is illegible at reading size.
export const SERIF_CH = 0.4;
