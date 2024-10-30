new Vue({
    el: '#app',
    data: {
        categories: ['Authenticator', 'Logging In', 'Emails', 'Adobe', 'XB' ], // Top-level categories
        subcategories: [], // Subcategories will be dynamically loaded
        selectedCategory: '', // Selected category
        selectedSubcategory: '', // Selected subcategory
        detail: '', // Holds the details input
        accumulatedFiles: [], // Store uploaded files
        responseMessage: '', // Server response message
        showResponseMessage: false, // Control the visibility of the response message
        showDetails: false, // Controls visibility of the details section
        showScreenshots: false, // Controls visibility of screenshots and submit button
        detailError: '',
        showOnlyOptions: false
    },
    watch: {
        selectedCategory(value) {
            this.loadSubCategories(); // Load subcategories when category is selected
            this.showDetails = !!value; // Show the details section if a category is selected
        },
        detail(value) {
            this.showScreenshots = value.length > 0; // Show screenshots field if details are provided
            this.validateDetail(); // Validate detail field in real-time
        }
    },
    methods: {
        // Load subcategories dynamically based on the selected category
        loadSubCategories() {
            switch (this.selectedCategory) {
                case 'Authenticator':
                    this.subcategories = ['Setting up new phone', 'Not prompting authenicator on login', 'Other'];
                    break;
                case 'Logging In':
                    this.subcategories = ['User Profile Disk Failed', 'Unable to Connect', 'Black Screen', 'Other'];
                    break;
                case 'Emails':
                    this.subcategories = ['Not recieving email', 'Cannot send email', 'Other'];
                    break;
                case 'Adobe':
                    this.subcategories = ['Cannot login', 'Renew Subscription', 'Other'];
                    break;
                case 'XB':
                    this.subcategories = ['Crashing', 'Generally slow', 'Other'];
                    break;
                default:
                    this.subcategories = [];
            }
        },
        // Validation to check detail field
        validateDetail() {
            const wordCount = this.detail.trim().split(/\s+/).length;
            const repeatedCharsPattern = /(.)\1{4,}/; // Detects 5 or more repeated character
            if (wordCount < 5) {
                this.detailError = 'Please provide at least 5 words to describe the issue.';
            } else if (repeatedCharsPattern.test(this.detail)) {
                this.detailError = 'Please avoid entering repeated characters (e.g., "xxxx").';
            } else {
                this.detailError = ''; // No errors
            }
        },
        // Handle form submission with validation
        handleFormSubmit(event) {
            event.preventDefault();
            this.validateDetail(); // Validate the detail field before submission

            if (this.detailError) {
                return; // Stop form submission if there is a validation error
            }
        
            const submitButton = event.target.querySelector('button[type="submit"]');
            submitButton.textContent = "Submitting...";
            submitButton.disabled = true;
        
            const formData = new FormData(); // Initialize FormData
            formData.append('category', this.selectedCategory);
            formData.append('subcategory', this.selectedSubcategory);
            formData.append('detail', this.detail);
            this.accumulatedFiles.forEach(file => {
                formData.append('screenshots', file); // Append files to FormData
            });
        
            // Submit the form
            fetch('/api/submit-form', {
                method: 'POST',
                body: formData,
            })
            .then(response => response.json())
            .then(data => {
                this.showResponseMessage = true;
                this.responseMessage = data.message;
                this.showOnlyOptions = true;
                submitButton.textContent = "Submit";
                submitButton.disabled = false;
                // Display success message for 3 seconds, then clear the form content
                setTimeout(() => {
                    this.showResponseMessage = false;
                    this.showOnlyOptions = true; // Show only buttons after delay
                }, 15000); // 15000ms = 15 seconds
            })
            .catch(error => {
                console.error('Error details:', error);
                this.showResponseMessage = true;
                this.responseMessage = 'An error occurred while submitting the form.';
                submitButton.textContent = "Submit";
                submitButton.disabled = false;
                setTimeout(() => this.showResponseMessage = false, 5000);
            });
            
        },    

        // Handle file input and validate file types and size limits
        handleFileInputChange(event) {
            console.log('Files:', event.target.files); // Keep this log to check file input
            const maxFileSize = 5 * 1024 * 1024; // 5MB file size limit
            const allowedFileTypes = ['.docx', '.xlsx', '.pptx', '.pdf', 'image/', 'video/', 'audio/'];

            for (let i = 0; i < event.target.files.length; i++) {
                const newFile = event.target.files[i];
                const fileTypeValid = allowedFileTypes.some(type => newFile.type.startsWith(type));
                const fileSizeValid = newFile.size <= maxFileSize;
            
                if (!fileTypeValid) {
                    alert(`${newFile.name} is not a valid file type.`);
                    continue;
                }
                if (!fileSizeValid) {
                    alert(`${newFile.name} exceeds the 5MB file size limit.`);
                    continue;
                }
                // Update Vue's data reactivity system
                this.accumulatedFiles = [...this.accumulatedFiles, newFile];
            }
            event.target.value = ""; // Clear input after handling
        },

        openNewTicket() {
            this.showOnlyOptions = false; // Reset to show the form again
            this.selectedCategory = '';
            this.selectedSubcategory = '';
            this.detail = '';
            this.accumulatedFiles = [];
        },
        viewExistingTickets() {
            window.location.href = '/user-tickets';
        }
    }
});
