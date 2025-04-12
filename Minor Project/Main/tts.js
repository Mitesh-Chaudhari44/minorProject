class TextToSpeech {
    constructor() {
        if (!window.speechSynthesis) {
            throw new Error('Speech synthesis is not supported in this browser');
        }

        this.synthesis = window.speechSynthesis;
        this.voice = null;
        this.isReading = false;
        this.currentUtterance = null;
        this.onStateChange = null;
        
        // Initialize voices
        this.loadVoices();
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    loadVoices() {
        try {
            const voices = this.synthesis.getVoices();
            
            if (!voices.length) {
                console.warn('No voices available yet, waiting for voices to load...');
                return;
            }

            // Try to find an English voice, preferring en-US
            this.voice = voices.find(voice => voice.lang === 'en-US') ||
                        voices.find(voice => voice.lang.startsWith('en-')) ||
                        voices[0];

            if (!this.voice) {
                throw new Error('No suitable voice found');
            }

            console.log('TTS Voice loaded:', this.voice.name);
            return voices;
        } catch (error) {
            console.error('Error loading voices:', error);
            throw error;
        }
    }

    getAvailableVoices() {
        return this.synthesis.getVoices();
    }

    setVoice(voice) {
        if (voice && this.synthesis.getVoices().includes(voice)) {
            this.voice = voice;
            return true;
        }
        return false;
    }

    speak(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (!text) {
                reject(new Error('No text provided'));
                return;
            }

            try {
                // Stop any ongoing speech
                this.stop();

                // Create utterance
                this.currentUtterance = new SpeechSynthesisUtterance(text);
                
                // Set voice and properties
                if (this.voice) {
                    this.currentUtterance.voice = this.voice;
                }

                // Apply options
                this.currentUtterance.rate = options.rate || 1;
                this.currentUtterance.pitch = options.pitch || 1;
                this.currentUtterance.volume = options.volume || 1;

                // Set up event handlers
                this.currentUtterance.onstart = () => {
                    this.isReading = true;
                    if (this.onStateChange) this.onStateChange('started');
                };

                this.currentUtterance.onend = () => {
                    this.isReading = false;
                    this.currentUtterance = null;
                    if (this.onStateChange) this.onStateChange('stopped');
                    resolve();
                };

                this.currentUtterance.onerror = (event) => {
                    this.isReading = false;
                    this.currentUtterance = null;
                    if (this.onStateChange) this.onStateChange('error');
                    reject(new Error(`Speech synthesis error: ${event.error}`));
                };

                // Start speaking
                this.synthesis.speak(this.currentUtterance);
            } catch (error) {
                this.isReading = false;
                this.currentUtterance = null;
                if (this.onStateChange) this.onStateChange('error');
                reject(error);
            }
        });
    }

    stop() {
        try {
            if (this.synthesis) {
                this.synthesis.cancel();
                this.isReading = false;
                this.currentUtterance = null;
                if (this.onStateChange) this.onStateChange('stopped');
            }
        } catch (error) {
            console.error('Error stopping speech:', error);
            throw error;
        }
    }

    pause() {
        try {
            if (this.synthesis && this.isReading) {
                this.synthesis.pause();
                if (this.onStateChange) this.onStateChange('paused');
            }
        } catch (error) {
            console.error('Error pausing speech:', error);
            throw error;
        }
    }

    resume() {
        try {
            if (this.synthesis && this.isReading) {
                this.synthesis.resume();
                if (this.onStateChange) this.onStateChange('resumed');
            }
        } catch (error) {
            console.error('Error resuming speech:', error);
            throw error;
        }
    }

    isActive() {
        return this.isReading;
    }

    setStateChangeCallback(callback) {
        if (typeof callback === 'function') {
            this.onStateChange = callback;
        }
    }
}

// Create a single instance for the application
try {
    window.tts = new TextToSpeech();
} catch (error) {
    console.error('Failed to initialize TextToSpeech:', error);
}

// Example usage:
/*
const tts = window.tts;

// Set up state change handler
tts.setStateChangeCallback((state) => {
    console.log('TTS State:', state);
});

// Basic usage
tts.speak('Hello, world!')
   .then(() => console.log('Speech completed'))
   .catch(error => console.error('Speech error:', error));

// Advanced usage with options
tts.speak('Hello with options', {
    rate: 1.2,
    pitch: 1.1,
    volume: 0.8
});

// Get available voices
const voices = tts.getAvailableVoices();

// Change voice
if (voices.length > 1) {
    tts.setVoice(voices[1]);
}
*/

// Add TTS functionality to news articles
function initializeNewsReader() {
    // Add read buttons to all news cards
    const newsCards = document.querySelectorAll('.news');
    newsCards.forEach(card => {
        // Only add the button if it doesn't already exist
        if (!card.querySelector('.tts-button')) {
            const button = createTTSButton();
            card.querySelector('.news-text').appendChild(button);

            // Add click handler
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const title = card.querySelector('h3').textContent;
                const description = card.querySelector('p').textContent;
                const text = `${title}. ${description}`;

                if (window.tts.isActive()) {
                    window.tts.stop();
                    button.classList.remove('playing');
                    button.innerHTML = '🔊 Read';
                } else {
                    // Stop any other playing buttons
                    document.querySelectorAll('.tts-button').forEach(btn => {
                        btn.classList.remove('playing');
                        btn.innerHTML = '🔊 Read';
                    });

                    // Play this article
                    button.classList.add('playing');
                    button.innerHTML = '⏹ Stop';
                    window.tts.speak(text, () => {
                        button.classList.remove('playing');
                        button.innerHTML = '🔊 Read';
                    });
                }
            });
        }
    });
}

function createTTSButton() {
    const button = document.createElement('button');
    button.className = 'tts-button';
    button.innerHTML = '🔊 Read';
    return button;
}

// Export the functions and objects
window.initializeNewsReader = initializeNewsReader; 