document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('support-form');
    const responseMessage = document.getElementById('response-message');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);

        try {
            const response = await fetch('/api/submit-form', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.status === 429) {
                responseMessage.innerHTML = `<div class="alert alert-danger">${result.message}</div>`;
            } else {
                form.reset();
                responseMessage.innerHTML = `<div class="alert alert-success">${result.message}</div>`;
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            responseMessage.innerHTML = `<div class="alert alert-danger">Error submitting form. Please try again.</div>`;
        }
    });
});
