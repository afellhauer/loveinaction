import { useState } from 'react';
import './Tutorial.css';

export default function Tutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const tutorialSteps = [
    {
      title: "Welcome to Love in Action!",
      content: "Let's walk you through how to use our platform.",
    },
    {
      title: "Finding Matches",
      content: "Click 'New Activity' to choose your activity and start matching with potential partners.",
    },
    {
      title: "Creating an Activity",
      content: "Once you've clicked 'New Activity', you can create an activity. This is where you enter time and place for your desired activity.",
    },
    {
      title: "Swiping for Matches",
        content: "Swipe right to like a profile, left to pass. If both users like each other, it's a match!",
    },
    {
      title: "Rating Matches",
      content: "After a date, don't forget to rate your match. This helps us improve your future matches!",
    }
  ];

  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsOpen(false);
      setCurrentStep(0);
    }
  };

  return (
    <>
      <button
          className="help-button"
          onClick={() => setIsOpen(true)}
          aria-label="Help"
      >
        ❔<span>Getting Started</span>
      </button>

      {isOpen && (
          <div className="tutorial-overlay">
          <div className="tutorial-modal">
            <button
              className="close-tutorial"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
            <h2>{tutorialSteps[currentStep].title}</h2>
            <p>{tutorialSteps[currentStep].content}</p>
            <div className="tutorial-controls">
              <div className="tutorial-dots">
                {tutorialSteps.map((_, index) => (
                  <span
                    key={index}
                    className={`dot ${index === currentStep ? 'active' : ''}`}
                  />
                ))}
              </div>
              <button onClick={nextStep}>
                {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}