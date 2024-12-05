document.addEventListener('DOMContentLoaded', async () => {
    const splashScreen = document.getElementById('splash-screen');
    const chatContainer = document.querySelector('.chat-container');

    // Show the splash screen for 5 seconds
    setTimeout(() => {
        splashScreen.style.display = 'none'; // Hide splash screen
        chatContainer.style.display = 'flex'; // Show chat container
    }, 5000);

    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    const chatBody = document.getElementById('chat-body');
    const typingIndicator = document.getElementById('typing-indicator');
    const themeToggle = document.getElementById('theme-toggle');
    const emojiBtn = document.getElementById('emoji-btn');

    // Load API key from config.json
    let huggingFaceApiKey;
    try {
        const response = await fetch('config.json');
        if (!response.ok) throw new Error('Network response was not ok');
        const config = await response.json();
        huggingFaceApiKey = config.huggingFaceApiKey;
    } catch (error) {
        console.error('Error loading config:', error);
        return; // Exit if the config cannot be loaded
    }

    const model = 'Qwen/Qwen2.5-72B-Instruct';

    // Emoji Picker setup
    const emojiPicker = document.createElement('div');
    emojiPicker.classList.add('emoji-picker');

    const emojis = [
        '😀', '😂', '😍', '👍', '🙏', '🎉', '😁', '🤯', '❤️',
        // Add more emojis as needed...
    ];
    
    emojis.forEach(emoji => {
        const span = document.createElement('span');
        span.textContent = emoji;
        span.addEventListener('click', () => {
            userInput.value += emoji;
            toggleEmojiPicker();
            userInput.focus();
        });
        emojiPicker.appendChild(span);
    });

    document.body.appendChild(emojiPicker);
    emojiBtn.addEventListener('click', toggleEmojiPicker);

    function toggleEmojiPicker() {
        emojiPicker.classList.toggle('visible');
    }

    // Hide the emoji picker when clicking outside of it
    document.addEventListener('click', (event) => {
        if (!emojiPicker.contains(event.target) && !emojiBtn.contains(event.target)) {
            emojiPicker.classList.remove('visible');
        }
    });

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const icon = themeToggle.querySelector('i');
        icon.classList.toggle('fa-moon');
        icon.classList.toggle('fa-sun');
    });

    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Fetch with timeout wrapper
    async function fetchWithTimeout(resource, options = {}, timeout = 500000) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const { signal } = controller;

        try {
            const response = await fetch(resource, { ...options, signal });
            clearTimeout(id); // Clear timeout on success
            return response;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Request timed out. Please try again.');
            }
            throw error;
        }
    }

    async function generateBotResponse(userMessage) {
        try {
            const response = await fetchWithTimeout(
                `https://api-inference.huggingface.co/models/${model}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${huggingFaceApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        inputs: userMessage,
                        parameters: {
                            max_length: 1000000, // Adjust this for longer responses
                            do_sample: true
                        }
                    })
                },
                500000 // Timeout set to 60 seconds
            );

            if (response.ok) {
                const data = await response.json();
                return data[0]?.generated_text || "Sorry, I couldn't process your request.";
            } else {
                throw new Error('Failed to fetch response from the API.');
            }
        } catch (error) {
            console.error('Error generating bot response:', error);
            return "Sorry, I'm experiencing some issues at the moment.";
        }
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === '') return;

        appendMessage(message, 'user');
        userInput.value = '';
        emojiPicker.classList.remove('visible');

        // Show typing indicator
        typingIndicator.classList.add('active');

        // Fallback to Hugging Face model
        const gptResponse = await generateBotResponse(message);
        appendMessage(gptResponse, 'bot');
        typingIndicator.classList.remove('active');
    }

    function appendMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', `${sender}-message`);

        const avatar = document.createElement('img');
        avatar.src = sender === 'bot' ? 'bot-avatar.png' : 'user-avatar.png'; // Replace with actual avatar paths
        avatar.alt = `${sender} Avatar`;
        avatar.classList.add('avatar');

        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        messageContent.innerHTML = `<p>${message}</p><span class="timestamp">${getCurrentTime()}</span>`;

        messageElement.appendChild(avatar);
        messageElement.appendChild(messageContent);
        chatBody.appendChild(messageElement);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function getCurrentTime() {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return `${hours}:${minutes} ${ampm}`;
    }
});
