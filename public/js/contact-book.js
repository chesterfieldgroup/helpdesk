// Base URL of the LinkHub site
const linkhubBaseUrl = 'https://chesterfieldgroup.github.io/linkhub/';

// Fetch the data from LinkHub dynamically
fetch(linkhubBaseUrl + 'data.json')
    .then(response => response.json())
    .then(data => {
        // Sort contacts alphabetically by name
        data.sort((a, b) => a.name.localeCompare(b.name));

        const contactList = document.getElementById('contact-list');

        data.forEach(person => {
            const cardContainer = document.createElement('div');
            cardContainer.classList.add('card-container');

            const cardContent = `
                <div class="card shadow-sm h-100">
                    <img src="${linkhubBaseUrl}${person.photo}" class="card-img-top" alt="${person.name}">
                    <div class="card-body text-center">
                        <h5 class="card-title">${person.name}</h5>
                        <p class="card-text">${person.role}</p>
                    </div>
                    <div class="card-footer text-center">
                        <a href="https://chesterfieldgroup.github.io/linkhub/?id=${person.id}" class="btn btn-primary">View Contact</a>
                    </div>
                </div>
            `;

            cardContainer.innerHTML = cardContent;
            contactList.appendChild(cardContainer);
        });
    })
    .catch(error => console.error('Error fetching contacts from LinkHub:', error));
