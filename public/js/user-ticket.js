console.log('Vue app mounting...');

new Vue({
    el: '#app',
    data: {
        showWithdrawModal: false,
        showImageModal: false,
        tickets: [],
        selectedTicket: null,
        sortOrder: 'desc',
        selectedSortOption: 'date',
        searchQuery: '',
        startDate: '',
        endDate: '',
        currentPage: 1,
        itemsPerPage: 10,
        visibleColumns: {
            id: true, subject: true, status: true, urgency: true, timestamp: true,
            engineer: true, detail: true, resolvement: true, screenshots: true, actions: true
        }
    },
    watch: {
        endDate: 'filterByDateRange',
        startDate: 'filterByDateRange',
        searchQuery: 'searchTickets'
    },
    methods: {
        fetchTickets() {
            fetch('/api/user-tickets')
                .then(response => response.json())
                .then(data => {
                    this.tickets = data.map(ticket => ({
                        ...ticket,
                        category: ticket.category || 'Uncategorized',
                        subcategory: ticket.subcategory || 'None',
                        showImage: false
                    }));
                })
                .catch(error => console.error('Error fetching tickets:', error));
        },
        searchTickets() {
            // Triggered by `searchQuery` watcher, no direct assignment to `filteredTickets`
            this.searchQuery = this.searchQuery.toLowerCase();
        },
        filterByDateRange() {
            // Triggered by `startDate` and `endDate` watchers, no direct assignment to `filteredTickets`
        },
        withdrawTicket(ticket) {
            if (!ticket) return;
            console.log('withdrawTicket called for ticket:', ticket);
            this.selectedTicket = ticket;
            this.showWithdrawModal = true;
        },
        
        confirmWithdraw() {
            if (this.selectedTicket) {
                console.log('Confirming withdraw for ticket:', this.selectedTicket);
                fetch(`/api/withdraw-ticket/${this.selectedTicket.id}`, { method: 'DELETE' })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            console.log('Ticket successfully withdrawn:', this.selectedTicket.id);
                            this.tickets = this.tickets.filter(ticket => ticket.id !== this.selectedTicket.id);
                            this.showWithdrawModal = false;
                            this.selectedTicket = null;
                        } else {
                            console.error('Error withdrawing ticket:', data.message);
                            alert('Failed to withdraw ticket: ' + data.message);
                        }
                    })
                    .catch(error => {
                        console.error('Error withdrawing ticket:', error);
                        alert('An error occurred while trying to withdraw the ticket.');
                    });
            }
        },
        closeWithdrawModal() {
            this.showWithdrawModal = false;
        },
        openImageModal(screenshots) {
            this.selectedScreenshots = screenshots.map(screenshot => screenshot.startsWith('/uploads/') ? screenshot : `/uploads/${screenshot}`);
            this.showImageModal = true;
        },
        closeImageModal() {
            this.showImageModal = false;
        },
        autoResize(event) {
            const textarea = event.target;
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        },
        formatDate(timestamp) {
            return new Date(timestamp).toLocaleDateString();
        },
        changePage(page) {
            this.currentPage = page;
        }
    },
    computed: {
        numberOfPages() {
            return Math.ceil(this.filteredTickets.length / this.itemsPerPage);
        },
        sortedTickets() {
            return this.filteredTickets
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);
        },
        filteredTickets() {
            const start = this.startDate ? new Date(this.startDate) : null;
            const end = this.endDate ? new Date(this.endDate) : null;
            const query = this.searchQuery.toLowerCase();
        
            return this.tickets
                .filter(ticket => {
                    const ticketDate = new Date(ticket.timestamp);
                    
                    // Strip time from date comparisons
                    const startOfDay = date => new Date(date.setHours(0, 0, 0, 0));
        
                    const ticketDateOnly = startOfDay(new Date(ticketDate));
                    const startDateOnly = start ? startOfDay(new Date(start)) : null;
                    const endDateOnly = end ? startOfDay(new Date(end)) : null;
        
                    return (!startDateOnly || ticketDateOnly >= startDateOnly) &&
                           (!endDateOnly || ticketDateOnly <= endDateOnly);
                })
                .filter(ticket =>
                    ticket.category.toLowerCase().includes(query) ||
                    ticket.subcategory.toLowerCase().includes(query) ||
                    ticket.detail.toLowerCase().includes(query) ||
                    ticket.status.toLowerCase().includes(query)
                );
        }
        ,
        modalVisible() {
            return this.showWithdrawModal;
        }
    },
    created() {
        this.fetchTickets();
        const socket = io();
        socket.on('ticketWithdrawn', (ticketId) => {
            console.log('Received ticketWithdrawn event for:', ticketId);
            this.tickets = this.tickets.filter(ticket => ticket.id !== ticketId);
        });
    }
});
