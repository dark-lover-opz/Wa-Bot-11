FROM quay.io/lyfe00011/md:beta
RUN git clone https://github.com/dark-lover-opz/Wa-Bot-11 /Dark-Xd/
WORKDIR /Dark-Xd/
RUN yarn install --network-concurrency 1
CMD ["node", "index.js"]
