\version "2.20.0"
\language "english"

% Helmut Lachenmann - Multiple Attack Types in Rapid Succession
% "Musique concrète instrumentale" approach
% Combines fingernail pizz, regular pizz, Bartok pizz, and col legno battuto
% Each attack type has distinct notation symbol

\paper{
  paper-width = 220
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

% Custom articulation for fingernail pizzicato (crescent/nail shape)
% Lachenmann uses various symbols - here we use a marcato-like accent
#(define-markup-command (nail layout props) ()
   (interpret-markup layout props
     (markup #:fontsize -2 #:italic "nail")))

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
                                                 (width 60)
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
        \override TextScript.font-size = #-3

        % === LACHENMANN MULTI-ATTACK SEQUENCE ===
        % Rapid alternation between different attack types
        % Each attack produces distinct timbre
        
        % Legend:
        % Regular pizz = normal notehead
        % Fingernail pizz = + above note (or "nail" text)
        % Bartok pizz = snap pizz symbol (circle with line)
        % Col legno battuto = x notehead
        
        \once \override TextScript.extra-offset = #'(-4 . 4)
        
        % Attack 1: Regular pizzicato
        c'16^\markup { \tiny \italic "pizz." }
        [
        
        % Attack 2: Fingernail pizzicato (+ symbol commonly used)
        c'16-+^\markup { \tiny \italic "nail" }
        
        % Attack 3: Bartok/snap pizzicato
        c'16\snappizzicato
        
        % Attack 4: Col legno battuto (x notehead)
        \once \override NoteHead.style = #'cross
        c'16^\markup { \tiny \italic "c.l.b." }
        ]
        
        % Repeat the cycle faster
        c'32[
        c'32-+
        c'32\snappizzicato
        \once \override NoteHead.style = #'cross
        c'32
        c'32
        c'32-+
        c'32\snappizzicato
        \once \override NoteHead.style = #'cross
        c'32
        ]
        
        % Irregular grouping - Lachenmann often uses asymmetric patterns
        \tuplet 5/4 {
          c'16
          c'16-+
          c'16\snappizzicato
          \once \override NoteHead.style = #'cross
          c'16
          c'16-+
        }
        
        % Final gesture with dynamics
        c'8\ff
        c'8-+\p
        c'8\snappizzicato\fff
        \once \override NoteHead.style = #'cross
        c'8\pp

      }

    >>

    \layout{
      \context {
        \Score
        proportionalNotationDuration = #(ly:make-moment 1/40)
        \override Beam.breakable = ##t
        \override Glissando.breakable = ##t
        \override TextSpanner.breakable = ##t
      }

      indent = 0
      line-width = 180\mm
      #(layout-set-staff-size 20)
    }

    \midi{}

  }
}
