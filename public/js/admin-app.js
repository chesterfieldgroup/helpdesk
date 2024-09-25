import { format } from 'https://cdn.jsdelivr.net/npm/date-fns@2.23.0/esm/index.js';
import Vue from 'https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.esm.browser.js'; // Import Vue as ES module

document.addEventListener('DOMContentLoaded', () => {
    new Vue({
        el: '#admin-app',
        data: {
            queries: [],
            sortOrder: 'desc', // Default sort order
            visibleColumns: {
                id: true,
                user: true,
                timestamp: true,
                subject: true,
                detail: true,
                screenshots: true,
                engineer: true,
                status: true,
                resolvement: true
            },
            searchId: '',
            searchUsername: '',
            searchSubject: '',
            filterEngineer: '',
            filterStatus: '',
            startDate: '',
            endDate: '',
            hasScreenshots: false,
            showFilters: false,  // Control the visibility of the filter panel
        },
        created() {
        // Load column visibility settings from localStorage
            try {
                const savedVisibleColumns = localStorage.getItem('visibleColumns');
                if (savedVisibleColumns) {
                    this.visibleColumns = JSON.parse(savedVisibleColumns);
                }
            } catch (error) {
                console.error("Error loading column visibility settings from localStorage:", error);
            }

            this.fetchQueries();
        },
        watch: {
        // Watch for changes in visibleColumns and save to localStorage
        visibleColumns: {
            handler(newValue) {
                localStorage.setItem('visibleColumns', JSON.stringify(newValue));
            },
            deep: true // This ensures nested properties are observed
        }
        },
        computed: {
            sortedQueries() {
                let filteredQueries = this.queries.filter(query => {
                    const queryDate = new Date(query.timestamp);
                    const startDate = this.startDate ? new Date(this.startDate) : null;
                    const endDate = this.endDate ? new Date(this.endDate) : null;

                    const matchesDateRange = (!startDate || queryDate >= startDate) && (!endDate || queryDate <= endDate);
                    const matchesEngineer = this.filterEngineer === '' || query.engineer === this.filterEngineer;
                    const matchesStatus = this.filterStatus === '' || query.status === this.filterStatus;
                    const matchesScreenshots = !this.hasScreenshots || query.screenshots.length > 0;
                    const matchesId = this.searchId === '' || query.id.includes(this.searchId);
                    const matchesUsername = this.searchUsername === '' || query.user.includes(this.searchUsername);
                    const matchesSubject = this.searchSubject === '' || query.subject.toLowerCase().includes(this.searchSubject.toLowerCase());

                    return matchesId && matchesUsername && matchesSubject && matchesEngineer && matchesStatus && matchesDateRange && matchesScreenshots;
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
            }
        },
        
        methods: {
            toggleFilterPanel() {
                this.showFilters = !this.showFilters;
            },
            async fetchQueries() {
                try {
                    const response = await fetch('/api/queries');
                    const queries = await response.json();
                    queries.forEach(query => query.showImage = false); 
                    this.queries = queries;

                    // Adjust the textarea heights after queries have been fetched
                    this.$nextTick(() => {
                        const textareas = document.querySelectorAll('.resolvement-input');
                        textareas.forEach(textarea => {
                            textarea.style.height = 'auto';
                            textarea.style.height = textarea.scrollHeight + 'px';
                        });
                    });
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
            statusClass(query) {
                switch(query.status) {
                    case 'Open': return 'status-open';
                    case 'In Progress': return 'status-inprogress';
                    case 'Completed': return 'status-completed';
                    default: return '';
                }
            },
            adjustTextareaHeight(event) {
                const element = event.target;
                element.style.height = 'auto'; // Reset height to recalculate
                element.style.height = element.scrollHeight + 'px'; // Set new height based on content
            },
            toggleImageVisibility(query) {
                Vue.set(query, 'showImage', !query.showImage);
            },
            updateEngineer(query) {
                const engineers = ["Jack", "Sean", "Nik", "Sean + Jack", "Nik + Sean", "Nik + Jack", "Full Squad"];  // Array of possible engineers
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
