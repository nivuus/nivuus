#!/usr/bin/env sh
# Copyright 2019 Allanic.me ISC License License
# For the full copyright and license information, please view the LICENSE
# file that was distributed with this source code.
# Created by mallanic <maxime@allanic.me> at 01/10/2019

apt update
apt install sudo apt-utils apt-transport-https -y
echo \"debconf debconf/frontend select Noninteractive\" | debconf-set-selections
npm install -g nodemon
cd /opt/server/
nodemon -L --watch /opt/server -e js,css,json,html ./index.js