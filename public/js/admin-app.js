import { format } from 'https://cdn.jsdelivr.net/npm/date-fns@2.23.0/esm/index.js';
import Vue from 'https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.esm.browser.js'; // Import Vue as ES module

document.addEventListener('DOMContentLoaded', () => {
    const socket = io(); // Connect to WebSocket server

    new Vue({
        el: '#admin-app',
        data: {
            queries: [],
            tempQueries: {},
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
    
            socket.on('queriesUpdated', (updatedQueries) => {
                console.log('Received queriesUpdated event');
                
                // Re-assign queries and tempQueries with fresh data
                this.queries = [];
                this.tempQueries = {};
            
                this.$nextTick(() => {  // Force re-render after emptying the array
                    this.queries = updatedQueries;
                    this.tempQueries = this.queries.reduce((acc, query) => {
                        acc[query.id] = { ...query };
                        return acc;
                    }, {});
                });
            });
            
            
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
                    return this.sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
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
                    this.queries = queries;
    
                    // Initialize tempQueries with a deep copy of queries
                    this.tempQueries = this.queries.reduce((acc, query) => {
                        acc[query.id] = { ...query };
                        return acc;
                    }, {});
                } catch (error) {
                    console.error('Error fetching queries:', error);
                }
            },
            saveAllChanges() {
                const updates = Object.values(this.tempQueries).filter((tempQuery) => {
                    const originalQuery = this.queries.find(query => query.id === tempQuery.id);
                    // Ensure updates only include modified fields
                    return JSON.stringify(tempQuery) !== JSON.stringify(originalQuery);
                });
                
                // Apply each update from tempQueries to queries before sending to server
                updates.forEach(updatedQuery => {
                    const index = this.queries.findIndex(query => query.id === updatedQuery.id);
                    if (index !== -1) {
                        this.queries[index] = { ...updatedQuery };
                    }
                });
            
                this.updateQueriesOnServer(updates);
            },
            async updateQueriesOnServer(updates) {
                try {
                    const sanitizedUpdates = updates.map(update => {
                        return {
                            ...update,
                            resolvement: update.resolvement.replace(/\s+/g, ' ').trim()  // Sanitize new lines/spaces
                        };
                    });
                    await fetch(`/api/update-queries`, { 
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ updates: sanitizedUpdates })
                    });
                    console.log('All changes successfully saved on the server.');
                } catch (error) {
                    console.error('Failed to save changes:', error);
                }
            },
            formatTimestamp(timestamp) {
                return format(new Date(timestamp), 'PPpp');
            },
            isImage(filePath) {
                return /\.(jpg|jpeg|png|gif)$/i.test(filePath);
            },
            statusClass(query) {
                switch(query.status) {
                    case 'Open': return 'status-open';
                    case 'In Progress': return 'status-inprogress';
                    case 'Completed': return 'status-completed';
                    case 'Withdrawn': return 'status-withdrawn';
                    default: return '';
                }
            },
            updateStatus(query) {
                const statusOptions = ["Open", "In Progress", "Completed"];
                let nextStatusIndex = (statusOptions.indexOf(this.tempQueries[query.id].status) + 1) % statusOptions.length;
                this.tempQueries[query.id].status = statusOptions[nextStatusIndex];
            },
            adjustTextareaHeight(event) {
                const element = event.target;
                element.style.height = 'auto';
                element.style.height = `${element.scrollHeight}px`;
            },
            toggleImageVisibility(query) {
                Vue.set(query, 'showImage', !query.showImage);
            },
            updateEngineer(query) {
                const engineers = ["Jack", "Sean", "Nik", "Sean + Jack", "Nik + Sean", "Nik + Jack", "Full Squad"];
                let currentEngineerIndex = engineers.indexOf(this.tempQueries[query.id].engineer);
                let nextEngineerIndex = (currentEngineerIndex + 1) % engineers.length;
                this.tempQueries[query.id].engineer = engineers[nextEngineerIndex];
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
                    this.fetchQueries();
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
