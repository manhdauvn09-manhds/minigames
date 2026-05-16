# Carogame (Kaya) static subapp — nginx:alpine serving the HTML/CSS/JS
# bundle. All AI runs client-side in JavaScript + a Web Worker, so there
# is no backend beyond this nginx layer.
FROM nginx:alpine

# Wipe nginx's stock default vhost so ours is the only server block.
RUN rm -f /etc/nginx/conf.d/default.conf

# Static bundle. The Kaya Design System folder ships alongside the app
# assets so CSS @import of `Kaya Design System/colors_and_type.css`
# resolves without a build step.
COPY index.html    /usr/share/nginx/html/
COPY selftest.html /usr/share/nginx/html/
COPY assets/       /usr/share/nginx/html/assets/
COPY src/          /usr/share/nginx/html/src/
# Folder name has a space -- must use JSON/exec form so the parser sees
# two distinct args. The shell-style `COPY "a b/" "c/"` form is NOT
# supported (we hit `unexpected end of statement while looking for
# matching double-quote` on first build).
COPY ["Kaya Design System/", "/usr/share/nginx/html/Kaya Design System/"]

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
