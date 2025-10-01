# Use the official Apache image as a base
FROM httpd:2.4

# Copy your custom httpd.conf
COPY httpd.conf /usr/local/apache2/conf/httpd.conf

# Copy your site files
COPY clonedSite/ /usr/local/apache2/htdocs/
COPY .htaccess /usr/local/apache2/htdocs/.htaccess