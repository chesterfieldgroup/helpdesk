# IT Support Hub

## Getting Started

### Prerequisites
- **Node.js** and **npm** installed on your machine.
- **Git** installed for cloning the repository.

### Installation
1. **Clone the Repository**:

   git clone <repository-url>

2. **Navigate to the Project Directory**:

    cd <repo-folder>

3. **Install Dependencies**:

    npm install

4. **Set Up Environment Variables**:

    Create a .env file in the project root, add necessary environment variables (refer to .env.example provided).

5. **Run the Application**:

    npm start

    This command executes node server.js, starting the helpdesk application on Port 3000 (change the port if already in use in server.js).

## Overview

The **IT Support Hub** is a streamlined web portal designed to facilitate seamless communication between the **H.W. Kaufman Group** IT support team and its users. Through this portal, users can efficiently submit IT support requests, track progress, and access a responsive, user-friendly interface that puts help just a few clicks away.

## Key Features

- **Responsive Design**: Built with Bootstrap, ensuring accessibility and responsiveness across all devices for a consistent user experience.
- **Simple Navigation**: Includes an intuitive navigation bar to guide users smoothly through the site.
- **Embedded IT Support Form**: Utilizes Microsoft Forms for quick and easy submission of IT support queries, streamlining issue reporting.
- **Company Branding**: Showcases the H.W. Kaufman Group logo and its subsidiaries, reinforcing brand identity and trust.

## Upcoming Enhancements

### Backend Development
- **Node.js Integration**: Implement a backend to push form data to a JSON database securely, with protections against **CSRF**, **XSS**, and file upload vulnerabilities.

### Authentication & Access
- **Azure OAuth**: Restrict form access to users with Microsoft accounts linked to `@chesterfieldgroup`, and limit admin access to specific team members (e.g., Sean and Jack).

### Enhanced Functionality
- **Screenshots in Forms**: Enable users to paste screenshots directly into the support form using **snip and cut**, with image visibility in the admin view.
- **Ticket Progress & History**: Allow users to view ticket status and history, with options to withdraw tickets if needed. *(DONE)*
- **Categorization of Subjects**: Strengthen subject categorization to improve ticket sorting and response prioritization.
- **Extended IT Requests**: Expand request types to include items such as new device requests (e.g., phones).
- **Admin Ticket Creation**: Add functionality for the admin to log tickets on behalf of users (e.g., from phone calls) without triggering follow-up emails to the user.
- **Ticket Aging Alerts**: Implement timers on tickets to highlight or escalate tickets that go stale.
- **Urgency Selection**: Allow users to set the urgency level of their ticket during submission. *(DONE)*

### Email & Communication
- **Automatic Updates via Email**: When replying to tickets via email, ensure responses are logged in ticket details to provide updated communication threads.
- **Email Chain Integration**: Enable seamless tracking of email chains within the ticket for continuous context.

### Database Integration
- **SQL Integration**: Transition to an SQL-based database for more robust data management and query capabilities.
