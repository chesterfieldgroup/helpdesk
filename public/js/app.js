document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('support-form');
    const fileInput = document.getElementById('screenshots');
    const uploadedFilesList = document.getElementById('uploaded-files-list');
    const detailField = document.getElementById('detail');
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
            const responseDiv = document.getElementById('response-message');
            responseDiv.style.display = 'block';
            responseDiv.textContent = data.message;
            responseDiv.className = data.success ? 'alert alert-success' : 'alert alert-danger';
        })
        .catch(error => {
            const responseDiv = document.getElementById('response-message');
            responseDiv.style.display = 'block';
            responseDiv.className = 'alert alert-danger';
            responseDiv.textContent = 'An unexpected error occurred while submitting the form.';
        });
    });

    // Handle file input changes, preventing duplicates
    fileInput.addEventListener('change', (event) => {
        for (let i = 0; i < event.target.files.length; i++) {
            const newFile = event.target.files[i];
            const fileExists = accumulatedFiles.some(file => file.name === newFile.name && file.size === newFile.size);

            // Only add the file if it does not already exist in accumulatedFiles
            if (!fileExists) {
                accumulatedFiles.push(newFile);
                displayUploadedFile(newFile);
            }
        }
        // Clear the file input after files are added to avoid re-triggering the change event on re-upload
        fileInput.value = "";
    });

    // Handle pasting images into the detail field
    detailField.addEventListener('paste', (event) => {
        const items = (event.clipboardData || window.clipboardData).items;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                const fileExists = accumulatedFiles.some(f => f.name === file.name && f.size === file.size);

                if (!fileExists) {
                    accumulatedFiles.push(file);
                    displayUploadedFile(file);
                }
            }
        }
    });

    // Function to display uploaded files
    function displayUploadedFile(file) {
        const li = document.createElement('li');
        li.textContent = file.name;
        uploadedFilesList.appendChild(li);
    }
});
