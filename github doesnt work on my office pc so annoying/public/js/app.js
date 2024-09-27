document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('support-form');
    const fileInput = document.getElementById('screenshots');
    const uploadedFilesList = document.getElementById('uploaded-files-list');
    const detailField = document.getElementById('detail');
    let accumulatedFiles = [];

    // Handle form submission
    form.addEventListener('submit', (event) => {
    event.preventDefault();
    
    const submitButton = document.querySelector('button[type="submit"]');
    submitButton.textContent = "Submitting...";
    submitButton.disabled = true;

    const formData = new FormData(form);
    accumulatedFiles.forEach(file => {
        formData.append('screenshots', file);
    });

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
        submitButton.textContent = "Submit";
        submitButton.disabled = false;

        setTimeout(() => {
            responseDiv.style.display = 'none';
        }, 5000); // Keeps message for 5 seconds
    })
    .catch(error => {
        const responseDiv = document.getElementById('response-message');
        responseDiv.style.display = 'block';
        responseDiv.className = 'alert alert-danger';
        responseDiv.textContent = 'An unexpected error occurred while submitting the form.';
        submitButton.textContent = "Submit";
        submitButton.disabled = false;
    });
    });


    // Handle file input changes, preventing duplicates
    fileInput.addEventListener('change', (event) => {
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const allowedFileTypes = ['.docx', '.xlsx', '.pptx', '.pdf', 'image/', 'video/', 'audio/'];

    for (let i = 0; i < event.target.files.length; i++) {
        const newFile = event.target.files[i];
        const fileTypeValid = allowedFileTypes.some(type => newFile.type.startsWith(type));
        const fileSizeValid = newFile.size <= maxFileSize;
        const fileExists = accumulatedFiles.some(file => file.name === newFile.name && file.size === newFile.size);

        if (!fileTypeValid) {
            alert(`${newFile.name} is not a valid file type.`);
            continue;
        }

        if (!fileSizeValid) {
            alert(`${newFile.name} exceeds the 5MB file size limit.`);
            continue;
        }

        if (!fileExists) {
            accumulatedFiles.push(newFile);
            displayUploadedFile(newFile);
        }
    }
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
