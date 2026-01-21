\version "2.24.4"

\score {
  \new RhythmicStaff \with {
    \override StaffSymbol.line-count = #1
    \override NoteHead.stencil = #ly:text-interface::print
    % This creates the "Block" look for all strings
    \override NoteHead.text = \markup {
      \filled-box #'(-0.6 . 0.6) #'(-1.5 . 1.5) #0
    }
  }
  {
    \time 4/4
    
    % A single percussive strike 
    g4\fff^\markup { 
      \center-column {
        \italic "c.l. batt."
        \fontsize #-3 "launch at all strings"
      }
    }
    
    % Add a spacer so you can see the single stroke clearly
    s2. 
    
    \bar "|."
  }
  
  \layout { 
    indent = 0
    ragged-right = ##t
  }
}