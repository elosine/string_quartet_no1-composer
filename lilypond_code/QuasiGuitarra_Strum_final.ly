\version "2.20.0"
\language "english"

% Quasi Guitarra - Guitar-style Strumming for Strings
% Based on Rimsky-Korsakov's Capriccio Espagnol technique
% Multiple fingers strum across strings like flamenco rasgueado
% Instrument held in "banjo position" or normal position with thumb strumming

\paper{
  paper-width = 180
  paper-height = 500

  top-margin = 5
  bottom-margin = 10
  left-margin = 1
  right-margin = 1

  system-system-spacing =
  #'((basic-distance . 15)
                            (minimum-distance . 8)
                            (padding . 2)
                            (stretchability . 60))
}

\book {
  \header {
    tagline = ##f
  }
  \score {
    <<
      \override Score.BarNumber.break-visibility = ##(#f #f #f)

      \new Staff \with {
        \omit TimeSignature
        \omit BarLine
        \clef alto
        \omit Clef
        \omit KeySignature
        \override StaffSymbol.thickness = #1

        % Custom staff lines
        \override StaffSymbol.stencil = #(lambda (grob)
                                          (let* ((staff-space (ly:staff-symbol-staff-space grob))
                                                 (line-count (ly:grob-property grob 'line-count 5))
                                                 (thickness (ly:grob-property grob 'thickness 1))
                                                 (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
                                                 (width 50)
                                                 (width-staff-spaces (/ (* width 2.8346) staff-space))
                                                 (half-height (* (/ (- line-count 1) 2) staff-space)))
                                            (apply ly:stencil-add
                                                   (map (lambda (i)
                                                          (ly:make-stencil
                                                           (list 'draw-line line-thickness 0 (* i staff-space) width-staff-spaces (* i staff-space))
                                                           (cons 0 width-staff-spaces)
                                                           (cons (- half-height) half-height)))
                                                        (iota line-count (- (/ (- line-count 1) 2)))))))
      }

      {
        \time 4/4
        \override TupletBracket.bracket-visibility = ##f
        \override TupletNumber.visibility = ##f
        \override NoteHead.font-size = #-2
        \override DynamicText.font-size = #-6
        \override Stem.details.beamed-lengths = #'(5)
        \override Stem.details.lengths = #'(6)
        \override Accidental.font-size = -4
        \override TextScript.font-size = #-2

        % === QUASI GUITARRA ===
        % Guitar-like strumming with chords
        % Arpeggio lines indicate rapid strum across strings
        % Arrow direction shows strum direction (up or down)
        
        \once \override TextScript.extra-offset = #'(-3 . 5)
        
        % Strummed chord with arpeggio marking (rapid strum)
        % Down-strum (low to high strings)
        \arpeggioArrowDown
        <c g c' e'>4\arpeggio^\markup { 
          \column { 
            \italic "quasi guitarra" 
            \tiny "(strum with thumb)"
          }
        }
        
        % Up-strum (high to low strings)
        \arpeggioArrowUp
        <c g c' e'>4\arpeggio
        
        % Alternating strums - rasgueado style
        \arpeggioArrowDown
        <c g c' e'>8\arpeggio
        \arpeggioArrowUp
        <c g c' e'>8\arpeggio
        \arpeggioArrowDown
        <c g c' e'>8\arpeggio
        \arpeggioArrowUp
        <c g c' e'>8\arpeggio
        
        \bar "||"
        
        % === RASGUEADO ===
        % Flamenco-style rapid finger fan
        % Each finger strikes in succession: pinky-ring-middle-index
        
        \once \override TextScript.extra-offset = #'(-2 . 4)
        
        % Notated as rapid grace notes fanning out
        \arpeggioArrowDown
        \grace {
          \override Stem.length = #8
          c32[ g32 c'32 e'32]
        }
        <c g c' e'>4^\markup { \italic "rasgueado" }
        
        % Multiple rasgueado strokes
        \grace { c32[ g32 c'32 e'32] }
        <c g c' e'>8
        \grace { e'32[ c'32 g32 c32] }
        <c g c' e'>8
        \grace { c32[ g32 c'32 e'32] }
        <c g c' e'>8
        \grace { e'32[ c'32 g32 c32] }
        <c g c' e'>8

      }

    >>

    \layout{
      \context {
        \Score
        proportionalNotationDuration = #(ly:make-moment 1/28)
        \override Beam.breakable = ##t
        \override Glissando.breakable = ##t
        \override TextSpanner.breakable = ##t
      }

      indent = 0
      line-width = 140\mm
      #(layout-set-staff-size 20)
    }

    \midi{}

  }
}
