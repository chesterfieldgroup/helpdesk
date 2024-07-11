import { format } from 'https://cdn.jsdelivr.net/npm/date-fns@2.23.0/esm/index.js';
import Vue from 'https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.esm.browser.js'; // Import Vue as ES module

document.addEventListener('DOMContentLoaded', () => {
    new Vue({
        el: '#admin-app',
        data: {
            queries: [],
            sortOrder: 'desc', // Default sort order
            searchId: '',
            searchUsername: ''
        },
        created() {
            this.fetchQueries();
        },
        computed: {
            sortedQueries() {
                let filteredQueries = this.queries.filter(query => {
                    return (
                        (this.searchId === '' || query.id.includes(this.searchId)) &&
                        (this.searchUsername === '' || query.user.includes(this.searchUsername))
                    );
                });
                return filteredQueries.slice().sort((a, b) => {
                    const dateA = new Date(a.timestamp);
                    const dateB = new Date(b.timestamp);
                    if (this.sortOrder === 'asc') {
                        return dateA - dateB;
                    } else {
                        return dateB - dateA;
                    }
                });
            },
            hasScreenshots() {
                return this.queries.some(query => query.screenshots && query.screenshots.length > 0);
            }
        },
        methods: {
            async fetchQueries() {
                try {
                    const response = await fetch('/api/queries');
                    const queries = await response.json();
                    // Initialize showImage to false for all queries
                    queries.forEach(query => query.showImage = false);
                    this.queries = queries;
                } catch (error) {
                    console.error('Error fetching queries:', error);
                }
            },
            formatTimestamp(timestamp) {
                return format(new Date(timestamp), 'PPpp');
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
            adjustTextareaHeight(event) {
                const element = event.target;
                element.style.height = 'auto'; // Reset height to recalculate
                element.style.height = element.scrollHeight + 'px'; // Set new height based on content
            },
            toggleImageVisibility(query) {
                // This toggles the visibility state of the image in the query object
                Vue.set(query, 'showImage', !query.showImage);
            },
            updateEngineer(query) {
                const engineers = ["Jack", "Sean", "Nik", "Sean + Jack", "Nik + Sean", "Full Squad"];  // Array of possible engineers
                let currentEngineerIndex = engineers.indexOf(query.engineer);  // Get current index
                let nextEngineerIndex = (currentEngineerIndex + 1) % engineers.length;  // Calculate next index
                query.engineer = engineers[nextEngineerIndex];  // Update to the next engineer
                this.saveQuery(query);  // Save the update
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
            },
            toggleSortOrder() {
                this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
            }
        }
    });
});
