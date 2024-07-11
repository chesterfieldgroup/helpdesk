document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('support-form');
    const fileInput = document.getElementById('screenshots');
    const uploadedFilesList = document.getElementById('uploaded-files-list');
    let accumulatedFiles = [];

    // Handle form submission
    form.addEventListener('submit', (event) => {
        event.preventDefault();

        // Create a new FormData object
        const formData = new FormData(form);

        // Append accumulated files to the FormData object
        accumulatedFiles.forEach((file) => {
            formData.append('screenshots', file);
        });

        // Send the form data via AJAX
        fetch('/api/submit-form', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            // Display response message
            document.getElementById('response-message').textContent = data.message;
            // Clear the accumulated files
            accumulatedFiles = [];
            // Clear the uploaded files list
            uploadedFilesList.innerHTML = '';
            // Reset the form
            form.reset();
        })
        .catch(error => {
            console.error('Error submitting form:', error);
        });
    });

    // Handle file input changes
    fileInput.addEventListener('change', (event) => {
        for (let i = 0; i < event.target.files.length; i++) {
            accumulatedFiles.push(event.target.files[i]);
            displayUploadedFile(event.target.files[i]);
        }
    });

    // Function to display uploaded files
    function displayUploadedFile(file) {
        const li = document.createElement('li');
        li.textContent = file.name;
        uploadedFilesList.appendChild(li);
    }
});
