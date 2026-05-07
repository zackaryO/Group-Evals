// Y/N/NA button group — preferred over a dropdown for tap-friendly mobile UX.
import React from 'react';

const YnButtons = ({ value, onChange, options = ['Y', 'N', 'NA'], includeUnknown = false }) => {
  const opts = includeUnknown ? [...options, 'unknown'] : options;
  return (
    <div className="js-yn-buttons">
      {opts.map((opt) => (
        <button
          key={opt}
          type="button"
          className={value === opt ? 'active' : ''}
          onClick={() => onChange(opt)}
        >
          {opt === 'unknown' ? '?' : opt}
        </button>
      ))}
    </div>
  );
};

export default YnButtons;
