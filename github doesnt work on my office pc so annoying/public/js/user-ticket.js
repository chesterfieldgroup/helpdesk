console.log('Vue app mounting...');
new Vue({
    el: '#app',  // Mount Vue to #app instead of #ticket-list
        data: {
        tickets: [], // Tickets fetched from the server
        sortOrder: 'desc', // Default sort order
        selectedSortOption: 'date', // Default sorting by date
        selectedScreenshots: [], // Array of screenshots for modal
        searchSubject: '', // Search query for subject
        filterStatus: '',  // Holds the selected status filter
        visibleColumns: {
            id: true,
            subject: true,
            status: true,
            urgency: true,
            timestamp: true,
            engineer: true,
            detail: true,
            resolvement: true,
            screenshots: true,
            actions: true
        }
    },
    methods: {
        fetchTickets() { 
            fetch('/api/user-tickets')
                .then(response => response.json())
                .then(data => {
                    this.tickets = data;
                })
                .catch(error => console.error('Error fetching tickets:', error));
        },
        openImageModal(screenshots) {
            this.selectedScreenshots = screenshots;
            $('#imageModal').modal('show');  // Use Bootstrap's jQuery to open the modal
        },
        isImage(file) {
            return /\.(jpg|jpeg|png|gif)$/i.test(file);
        },
        formatDate(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleDateString();  // Adjust the date format as needed
        },
        toggleSortOrder() {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        },
        sortedTickets() {
            // Sorting logic based on selected sort option
            return this.tickets
                .filter(ticket => {
                    return (
                        (!this.filterStatus || ticket.status === this.filterStatus) &&
                        ticket.subject.toLowerCase().includes(this.searchSubject.toLowerCase())
                    );
                })
                .sort((a, b) => {
                    switch (this.selectedSortOption) {
                        case 'status':
                            return this.compareValues(a.status, b.status);
                        case 'urgency':
                            return this.compareValues(a.urgency, b.urgency);
                        case 'subject':
                            return this.compareValues(a.subject, b.subject);
                        case 'date':
                        default:
                            const dateA = new Date(a.timestamp);
                            const dateB = new Date(b.timestamp);
                            return this.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
                    }
                });
        },
        compareValues(valueA, valueB) {
            if (this.sortOrder === 'asc') {
                return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
            } else {
                return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
            }
        },
        sortTickets() {
            // This triggers a re-render based on the selected sort option
            console.log("Sorting by:", this.selectedSortOption);
        },
        toggleColumnVisibility(column) {
            this.visibleColumns[column] = !this.visibleColumns[column];
        },
        withdrawTicket(ticket) {
            this.selectedTicket = ticket;
            $('#withdrawModal').modal('show');
        },
        confirmWithdraw() {
            if (this.selectedTicket) {
                console.log("Withdrawing ticket:", this.selectedTicket);

                // Send request to delete the ticket
                fetch(`/api/withdraw-ticket/${this.selectedTicket.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                })
                    .then(response => response.json())
                    .then(data => {
                        console.log("Server response:", data);
                        if (data.success) {
                            // Remove the ticket from the UI
                            this.tickets = this.tickets.filter(ticket => ticket.id !== this.selectedTicket.id);
                            $('#withdrawModal').modal('hide');
                            this.selectedTicket = null;
                        } else {
                            console.error('Error withdrawing ticket:', data.message);
                        }
                    })
                    .catch(error => console.error('Error withdrawing ticket:', error));
            }
        },
        autoResize(event) {
            const textarea = event.target;
            textarea.style.height = 'auto';  // Reset the height
            textarea.style.height = `${textarea.scrollHeight}px`;  // Adjust based on scroll height
        },
        updateTicket(ticket) {
            console.log("Updating ticket:", ticket);

            // Send updated ticket to server
            fetch(`/api/update-ticket/${ticket.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(ticket)  // Send the updated ticket as JSON
            })
            .then(response => response.json())
            .then(data => {
                console.log("Ticket update response:", data);
                if (!data.success) {
                    console.error('Error updating ticket:', data.message);
                }
            })
            .catch(error => console.error('Error updating ticket:', error));
        },
    },
    created() {
            this.fetchTickets();
    }
})
