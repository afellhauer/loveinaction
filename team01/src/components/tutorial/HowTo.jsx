// 📁 src/components/tutorial/HowTo.jsx
import {useEffect, useState} from 'react';
import './HowTo.css';

export default function HowTo() {
    const [selectedTopic, setSelectedTopic] = useState(null);
    const [currentImage, setCurrentImage] = useState(0);

    const handleClose = () => {
        setSelectedTopic(null);
        setCurrentImage(0);
    }

    useEffect(() => {
        if (selectedTopic) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        // Cleanup when component unmounts
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedTopic]);

    const chatImages = [
        '/images/help/chat/chatHelp1.png',
        '/images/help/chat/chatHelp2.png',
        '/images/help/chat/chatHelp3.png',
        '/images/help/chat/chatHelp4.png',
        '/images/help/chat/chatHelp5.png',
    ];

    const blockingImages = [
        '/images/help/blocking/blockingHelp1.png',
        '/images/help/blocking/blockingHelp2.png',
    ]

    const getImageListByTopic = (topic) => {
        switch (topic) {
            case 'chat':
                return chatImages;
            case 'blocking':
                return blockingImages;
            default:
                return [];
        }
    }

    const nextImage = (imageList) => {
        setCurrentImage((prev) => (prev + 1) % imageList.length);
    };

    const prevImage = (imageList) => {
        setCurrentImage((prev) => (prev - 1 + imageList.length) % imageList.length);
    };

  const topics = {
      chat: {
          title: 'Chat',
          questions: [
              { q: 'How do I start a chat?',
                  a: 'Once you have a match, you can start chatting immediately. Click on the chat icon in your matches list to begin.' },
              { q: 'How do I use the chat?',
                  a: 'Our chat system uses preset messages to ensure safe and respectful communication. Upon making a new match, users will be able to suggest plans to the other person. The suggest plans pop up allows you to type a specific time and place (be as specific as possible!). Once sent, you can suggest alternative plans or wait for the other user to reply. Your match can respond in three ways: "Sorry I can no longer make it" (plans are cancelled), "Sounds good" (they agree to your plans), or they can suggest an alternative time and place. If either person says "sounds good", you\'ll have the option to confirm the plans and the date is finalized!',
                  hasImages: true }
          ]
      },
        matching: {
          title: 'Matching',
          questions: [
            { q: 'How does matching work?',
              a: 'Click "New Match" to view potential matches. Swipe right to like, left to pass. When both users like each other, it\'s a match!' },
            { q: 'Why is my New Match button disabled?',
              a: 'You need to rate your previous matches before starting new ones. This helps improve our matching algorithm.' }
          ]
        },
        profile: {
          title: 'Profile',
          questions: [
            { q: 'How do I edit my profile?',
              a: 'Go to your profile page and click the edit button. You can update your photos, bio, and preferences.' },
            { q: 'What makes a good profile?',
              a: 'Clear, recent photos and an honest, detailed bio help others get to know you better.' },
            { q: 'How do I verify my profile?',
              a: 'To verify your profile, go to your profile page and scroll to the ID verification section. Follow the steps to upload one of the official forms of ID and earn a verified profile badge.'},
            { q: 'Can I deactivate my profile?',
              a: 'Yes. Go to the bottom of your profile page and click the "Show Profile Settings" button. Click "Deactivate Profile". Deactivated accounts will not be visible to other users. You can reactivate it later by logging back in.'
            }
          ]
        },
        rating: {
          title: 'Rating',
          questions: [
            { q: 'Why should I rate matches?',
              a: 'Rating helps improve future matches and maintains community safety. It\'s required before starting a new activity .' },
            { q: 'How does the rating system work?',
              a: 'After a date, rate your match based on profile accuracy and behavior. Be honest but respectful.' }
          ]
        },
        safety: {
          title: 'Safety Score',
          questions: [
            { q: 'What is a Safety Score?',
              a: 'Your Safety Score reflects your trustworthiness based on profile verification, ratings, and behavior.' },
            { q: 'How can I improve my score?',
              a: 'Verify your profile, maintain positive interactions, and receive good ratings from your matches.' }
          ]
        },
        trusted: {
          title: 'Trusted Contact & Safety Notifications',
          questions: [
            {
              q: 'What is a trusted contact?',
              a: 'A trusted contact is someone you choose (like a friend or family member) who can be notified automatically when you confirm a date. This helps keep you safe by letting someone you trust know your plans.'
            },
            {
              q: 'How does the auto-notify trusted contact feature work?',
              a: 'If you enable the auto-notify option in your profile and provide a trusted contact email, your trusted contact will automatically receive an email with your date details (time, place, and who you are meeting) as soon as both users confirm the plans.'
            },
            {
              q: 'How do I set or change my trusted contact?',
              a: 'Go to your profile page and fill in the Trusted Contact section with their name and email. You can update or remove this information at any time.'
            }
          ]
        },
      blocking: {
          title: 'Blocking',
          questions: [
            { q: 'How do I block someone?',
              a: 'Go to your chat with the individual and click the red flag beside their profile. This prevents them from seeing your profile or matching with you in the future.',
                hasImages: true},
          ],

      }
      };



      return (
        <div className="howto-container">
          <h1>How To Use Love in Action</h1>
          <div className="topics-grid">
            {Object.entries(topics).map(([key, topic]) => (
              <div key={key} className="topic-card">
                <h2>{topic.title}</h2>
                <div className="questions-list">
                  {topic.questions.map((item, index) => (
                    <button
                      key={index}
                      className="question-button"
                      onClick={() => setSelectedTopic({ ...item, section: topic.title })}
                    >
                      {item.q}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

            {selectedTopic && (
                <div className="modal-overlay" onClick={handleClose}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-button" onClick={handleClose}>×</button>
                        <h3>{selectedTopic.section}</h3>
                        <h4>{selectedTopic.q}</h4>
                        <p>{selectedTopic.a}</p>

                        {selectedTopic.hasImages && (
                            <div className="image-carousel">
                                <div className="image-container">
                                    <img
                                        src={getImageListByTopic(selectedTopic.section.toLowerCase())[currentImage]}
                                        alt={`Chat help step ${currentImage + 1}`}
                                    />
                                    <div className="image-indicators">
                                        {getImageListByTopic(selectedTopic.section.toLowerCase()).map((_, index) => (
                                            <span
                                                key={index}
                                                className={`indicator ${index === currentImage ? 'active' : ''}`}
                                                onClick={() => setCurrentImage(index)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="navigation-buttons">
                                    <button
                                        className="navigation-button"
                                        onClick={() => prevImage(getImageListByTopic(selectedTopic.section.toLowerCase()))}
                                    >
                                        Back
                                    </button>
                                    <button
                                        className="navigation-button"
                                        onClick={() => nextImage(getImageListByTopic(selectedTopic.section.toLowerCase()))}
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      );
}