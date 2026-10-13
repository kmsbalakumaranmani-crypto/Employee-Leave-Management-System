@echo off
title Reset Jenkins Password and Unlock Dashboard
echo Requesting administrator privileges...
powershell -Command "Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"%~dp0reset-jenkins.ps1\"'"
