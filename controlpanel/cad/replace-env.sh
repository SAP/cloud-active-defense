#!/bin/sh

for file in /usr/share/nginx/html/*.js; do
  echo "Processing $file ...";
  sed -i 's|<REPLACE_CONTROLPANEL_API_URL>|'${CONTROLPANEL_API_URL}'|g' $file
done

exec "$@"