document.addEventListener('DOMContentLoaded', () => {
    const urlForm = document.getElementById('url-form');
    const urlInput = document.getElementById('url-input');
    const loadingElement = document.getElementById('loading');
    const errorMessage = document.getElementById('error-message');
    const resultContainer = document.getElementById('result-container');
    const contentDisplay = document.getElementById('content-display');
    const originalUrlElement = document.getElementById('original-url');
    const pageTitleElement = document.getElementById('page-title');
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = themeToggle.querySelector('i');

    // Check for saved theme preference or use preferred color scheme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark-mode');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }

    // Theme toggle functionality
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        
        // Update icon
        if (document.body.classList.contains('dark-mode')) {
            themeIcon.classList.replace('fa-moon', 'fa-sun');
            localStorage.setItem('theme', 'dark');
        } else {
            themeIcon.classList.replace('fa-sun', 'fa-moon');
            localStorage.setItem('theme', 'light');
        }
    });

    urlForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const url = urlInput.value.trim();
        
        if (!url) {
            showError('Please enter a valid URL');
            return;
        }
        
        // Show loading indicator
        loadingElement.classList.remove('hidden');
        resultContainer.classList.add('hidden');
        errorMessage.classList.add('hidden');
        
        try {
            const response = await fetch('/fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ url })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch content');
            }
            
            // Update the info bar
            originalUrlElement.textContent = url;
            originalUrlElement.href = url;
            pageTitleElement.textContent = data.title || 'No title';
            
            // Create a sandboxed iframe to display the content
            const iframe = document.createElement('iframe');
            iframe.sandbox = 'allow-same-origin allow-scripts';
            contentDisplay.innerHTML = '';
            contentDisplay.appendChild(iframe);
            
            // Write the modified HTML to the iframe
            const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
            iframeDocument.open();
            iframeDocument.write(data.content);
            iframeDocument.close();
            
            // Adjust iframe height to match content
            iframe.onload = function() {
                iframe.style.height = iframeDocument.body.scrollHeight + 'px';
                
                // Make sure links open in a new tab
                const links = iframeDocument.querySelectorAll('a');
                links.forEach(link => {
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                });
            };
            
            // Show result container
            resultContainer.classList.remove('hidden');
        } catch (error) {
            showError(error.message);
        } finally {
            // Hide loading indicator
            loadingElement.classList.add('hidden');
        }
    });
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
});
