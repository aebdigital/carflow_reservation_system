#!/usr/bin/env python3
"""
Script to update server.js by replacing SendGrid functionality with comprehensive email service
"""

import re

def update_server_js():
    # Read the original server.js
    with open('server.js', 'r') as f:
        content = f.read()
    
    # Replace SendGrid import with email service import
    content = re.sub(
        r'const emailService = require\(\'@sendgrid/mail\'\);',
        'const emailService = require(\'./services/emailService\');',
        content
    )
    
    # Remove SendGrid configuration section
    content = re.sub(
        r'/\* ----------------------------------\n   0\) Configure SendGrid\n---------------------------------- \*/.*?console\.log\(\'SendGrid from email:\', process\.env\.SENDGRID_FROM_EMAIL \|\| \'Not set\'\);',
        '/* ----------------------------------\n   0) Email Service Configuration\n---------------------------------- */\nconsole.log(\'Email service will be configured automatically...\');',
        content,
        flags=re.DOTALL
    )
    
    # Find and replace the EMAIL ROUTES section
    email_routes_pattern = r'/\* ----------------------------------\n   EMAIL ROUTES\n---------------------------------- \*/(.*?)(?=\n/\* ----------------------------------|\nconst PORT|\napp\.listen|$)'
    
    # Read the replacement email routes
    with open('email-routes-replacement.js', 'r') as f:
        new_email_routes = f.read()
    
    # Replace the email routes section
    content = re.sub(
        email_routes_pattern,
        new_email_routes,
        content,
        flags=re.DOTALL
    )
    
    # Write the updated content back
    with open('server.js', 'w') as f:
        f.write(content)
    
    print("✅ Successfully updated server.js")
    print("   - Replaced SendGrid with comprehensive email service")
    print("   - Updated email routes to use new service")
    print("   - Added email status and test endpoints")

if __name__ == "__main__":
    update_server_js() 