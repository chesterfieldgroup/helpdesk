new Vue({
    el: '#admin-app',
    data: {
        queries: [] // Initialize queries as an empty array
    },
    created: function() {
        // Fetch the queries.json file on component creation
        fetch('queries.json')
            .then(response => response.json())
            .then(data => {
                this.queries = data; // Assign the fetched data to the queries array
            })
            .catch(error => console.error('Error fetching queries:', error));
    }
});
