/**
 * Skip Link Component
 *
 * Provides a skip navigation link for keyboard users
 * to quickly jump to main content, bypassing navigation.
 *
 * @module components/SkipLink
 * @version 1.0.0
 */

import React from 'react';

const SkipLink: React.FC = () => {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <style>{`
        .skip-link {
          position: absolute;
          top: -40px;
          left: 0;
          background-color: var(--color-primary);
          color: white;
          padding: 8px 16px;
          text-decoration: none;
          font-weight: 600;
          border-radius: 0 0 4px 0;
          z-index: 10001;
          transition: top 0.2s;
        }

        .skip-link:focus {
          top: 0;
        }

        .skip-link:focus-visible {
          outline: 3px solid var(--color-primary-dark);
          outline-offset: 2px;
        }
      `}</style>
    </>
  );
};

export default SkipLink;
