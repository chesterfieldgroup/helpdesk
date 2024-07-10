document.addEventListener('DOMContentLoaded', () => {
    new Vue({
        el: '#admin-app',
        data: {
            queries: []
        },
        created() {
            this.fetchQueries();
        },
        methods: {
            async fetchQueries() {
                try {
                    const response = await fetch('/api/queries');
                    this.queries = await response.json();
                } catch (error) {
                    console.error('Error fetching queries:', error);
                }
            },
            isImage(filePath) {
                return /\.(jpg|jpeg|png|gif)$/i.test(filePath);
            },
            updateStatus(query) {
                const statusOptions = ["Open", "In Progress", "Completed"];
                let nextStatusIndex = (statusOptions.indexOf(query.status) + 1) % statusOptions.length;
                query.status = statusOptions[nextStatusIndex];
                this.saveQuery(query);
            },
            statusColor(status) {
                switch(status) {
                    case 'Open': return 'red';
                    case 'In Progress': return 'orange';
                    case 'Completed': return 'green';
                    default: return 'black';
                }
            },
            updateResolvement(query) {
                this.saveQuery(query);
            },
            async saveQuery(query) {
                try {
                    await fetch(`/api/update-query/${query.id}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(query)
                    });
                    this.fetchQueries(); // Reload queries to reflect changes
                } catch (error) {
                    console.error('Failed to save query:', error);
                }
            }
        }
    });
});
