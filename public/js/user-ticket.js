console.log('Vue app mounting...');
new Vue({
    el: '#app',  // Mount Vue to #app instead of #ticket-list
    data: {
        showModal: false,
        tickets: [], // Tickets fetched from the server
        filteredTickets: [], // Holds the tickets filtered by date range or search
        sortOrder: 'desc', // Default sort order
        selectedSortOption: 'date', // Default sorting by date
        selectedScreenshots: [], // Array of screenshots for modal
        searchSubject: '', // Search query for subject
        filterStatus: '',   // Holds the selected status filter
        searchQuery: '',
        startDate: '', // Holds the start date for date range filtering
        endDate: '',   // Holds the end date for date range filtering
        daysFilter: 7,
        currentPage: 1,
        itemsPerPage: 10,
        message: 'Vue is working!',
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
    watch: {
        endDate: 'filterByDateRange',  // Automatically filter when end date changes
        startDate: 'filterByDateRange', // Automatically filter when start date changes
        searchQuery: 'searchTickets' // Automatically search when the query changes
    },
    methods: {
        fetchTickets() {
            fetch('/api/user-tickets')
                .then(response => response.json())
                .then(data => {
                    this.tickets = data.map(ticket => ({
                        ...ticket,
                        category: ticket.category || 'Uncategorized',  // Fallback for older tickets
                        subcategory: ticket.subcategory || 'None',
                        showImage: false
                    }));
                    this.filterByDateRange();
                })
                .catch(error => console.error('Error fetching tickets:', error));
        },
        searchTickets() {
            const query = this.searchQuery.toLowerCase();
                
            if (!query) {
                // If search query is empty, show all tickets again
                this.filteredTickets = this.tickets;
            } else {
                this.filteredTickets = this.tickets.filter(ticket => {
                    return (
                        ticket.category.toLowerCase().includes(query) ||  // Search by category
                        ticket.subcategory.toLowerCase().includes(query) ||  // Search by subcategory
                        ticket.detail.toLowerCase().includes(query) ||  // Search by detail
                        ticket.status.toLowerCase().includes(query)  // Search by status
                    );
                });
            }
        },

        filterByDateRange() {
          const start = this.startDate ? new Date(this.startDate) : null;
          const end = this.endDate ? new Date(this.endDate) : null;

          this.filteredTickets = this.tickets.filter(ticket => {
            const ticketDate = new Date(ticket.timestamp);
            return (!start || ticketDate >= start) && (!end || ticketDate <= end);
          });
        },
        openImageModal(screenshots) {
            console.log('Opening image modal with screenshots:', screenshots); 
            this.selectedScreenshots = screenshots.map(screenshot => `/uploads/${screenshot}`);
            this.showModal = true;

            // Trigger the Bootstrap modal via jQuery
            $('#imageModal').modal('show');
        },

        closeModal() {
            this.showModal = false;

            // Manually hide the Bootstrap modal via jQuery
            $('#imageModal').modal('hide');
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
        compareValues(valueA, valueB) {
            if (this.sortOrder === 'asc') {
                return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
            } else {
                return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
            }
        },
        toggleImageVisibility(ticket) {
            ticket.showImage = !ticket.showImage;
        },
        changePage(page) {
          this.currentPage = page;
        },
        updateDaysFilter(days) {
            this.daysFilter = days;
            this.fetchTickets();
        },
        sortTickets() {
            console.log("Sorting by:", this.selectedSortOption);
        },
        toggleColumnVisibility(column) {
            this.visibleColumns[column] = !this.visibleColumns[column];
        },
        withdrawTicket(ticket) {
            this.selectedTicket = ticket;  // Store the selected ticket for confirmation
            $('#withdrawModal').modal('show');  // Open the confirmation modal
        },
        confirmWithdraw() {
            if (this.selectedTicket) {
                fetch(`/api/withdraw-ticket/${this.selectedTicket.id}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        this.tickets = this.tickets.filter(ticket => ticket.id !== this.selectedTicket.id);  // Remove the ticket from the list
                        $('#withdrawModal').modal('hide');  // Close the modal
                        this.selectedTicket = null;  // Clear the selected ticket
                    } else {
                        console.error('Error withdrawing ticket:', data.message);
                    }
                })
                .catch(error => console.error('Error withdrawing ticket:', error));
            }
        },
        autoResize(event) {
            const textarea = event.target;
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
        },
        updateTicket(ticket) {
            console.log("Updating ticket:", ticket);
            fetch(`/api/update-ticket/${ticket.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: ticket.category,
                    subcategory: ticket.subcategory,
                    urgency: ticket.urgency,
                    detail: ticket.detail,
                    status: ticket.status,
                    resolvement: ticket.resolvement,
                    screenshots: ticket.screenshots
                })
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    console.error('Error updating ticket:', data.message);
                }
            })
            .catch(error => console.error('Error updating ticket:', error));
        },

    },
    computed: {
      numberOfPages() {
        return Math.ceil(this.filteredTickets.length / this.itemsPerPage);
      },
      sortedTickets() {
        return this.filteredTickets
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Sort by date
          .slice((this.currentPage - 1) * this.itemsPerPage, this.currentPage * this.itemsPerPage);  // Paginate
      }
    },
    created() {
        this.fetchTickets();
    },
});
