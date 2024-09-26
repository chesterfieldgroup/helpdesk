console.log('Vue app mounting...');
new Vue({
    el: '#app',  // Mount Vue to #app instead of #ticket-list
    data: {
        tickets: [], // Tickets fetched from the server
        selectedTicket: null // The ticket selected for withdrawal
    },
    methods: {
        fetchTickets() {
        console.log("Fetching tickets...");  // Log when the function is called
        fetch('/api/user-tickets')
            .then(response => {
                console.log('Response status:', response.status);  // Log the response status
                return response.json();
            })
            .then(data => {
                console.log("Tickets fetched:", data);  // Log the response data
                this.tickets = data;
            })
            .catch(error => console.error('Error fetching tickets:', error));
        },
        formatDate(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleDateString();  // Adjust the date format as needed
        },
        getProgressBarClass(status) {
            if (status === 'Open') {
                return 'bg-warning';
            } else if (status === 'In Progress') {
                return 'bg-info';
            } else if (status === 'Completed') {
                return 'bg-success';
            } else {
                return 'bg-secondary';
            }
        },
        getProgressWidth(status) {
            if (status === 'Open') {
                return 'width: 25%';
            } else if (status === 'In Progress') {
                return 'width: 50%';
            } else if (status === 'Completed') {
                return 'width: 100%';
            } else {
                return 'width: 0%';
            }
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
    },
    created() {
            this.fetchTickets();
    }
})
