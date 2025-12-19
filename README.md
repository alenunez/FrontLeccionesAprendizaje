# Lecciones aprendidas repositorio

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/hozcar-9636s-projects/v0-lecciones-aprendidas-repositorio)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/eOM1J0Xls6E)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/hozcar-9636s-projects/v0-lecciones-aprendidas-repositorio](https://vercel.com/hozcar-9636s-projects/v0-lecciones-aprendidas-repositorio)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/eOM1J0Xls6E](https://v0.app/chat/eOM1J0Xls6E)**

## Configuración de límites del formulario

Los topes de adjuntos y caracteres del formulario se cargan automáticamente desde el endpoint protegido `/Configuraciones` tan pronto como el usuario inicia sesión (o al recargar con una sesión válida). Si el servicio no responde, se aplican los valores por defecto indicados abajo.

| Campo | Descripción | Valor por defecto |
| --- | --- | --- |
| `maxAttachments` | Número máximo de archivos adjuntos permitidos. | `3` |
| `maxAttachmentMb` | Peso máximo por adjunto expresado en MB. | `2` (MB) |
| `attachmentNameMaxLength` | Longitud máxima del nombre del archivo (sin extensión). | `50` |
| `textareaMaxLength` | Límite general de caracteres para la mayoría de los campos de texto. | `100` |
| `aplicacionPracticaMaxLength` | Límite de caracteres para el campo “Aplicación práctica”. | `100` |
| `eventDescriptionMaxLength` | Límite de caracteres para las descripciones de eventos. | `100` |
| `eventTableTextareaMaxLength` | Límite de caracteres para tablas y notas de eventos. | `100` |

> Todos los valores deben ser enteros positivos. Los límites se vuelven a solicitar después de cada inicio de sesión o recarga cuando exista una sesión válida.

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
