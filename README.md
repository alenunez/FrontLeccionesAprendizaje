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

Los topes de adjuntos y caracteres del formulario se leen desde variables de entorno **con prefijo `NEXT_PUBLIC_`**. Si alguna no está definida, se usan los valores por defecto indicados abajo. Colócalas en el App Service (o en el entorno donde despliegues el frontend) para ajustar los límites sin modificar el código.

| Variable de entorno | Descripción | Valor por defecto |
| --- | --- | --- |
| `NEXT_PUBLIC_MAX_ATTACHMENTS` | Número máximo de archivos adjuntos permitidos. | `5` |
| `NEXT_PUBLIC_MAX_ATTACHMENT_MB` | Peso máximo por adjunto expresado en MB. | `20` (MB) |
| `NEXT_PUBLIC_ATTACHMENT_NAME_MAX_LENGTH` | Longitud máxima del nombre del archivo (sin extensión). | `50` |
| `NEXT_PUBLIC_TEXTAREA_MAX_LENGTH` | Límite general de caracteres para la mayoría de los campos de texto. | `200` |
| `NEXT_PUBLIC_APLICACION_PRACTICA_MAX_LENGTH` | Límite de caracteres para el campo “Aplicación práctica”. | `400` |
| `NEXT_PUBLIC_EVENT_DESCRIPTION_MAX_LENGTH` | Límite de caracteres para las descripciones de eventos. | `400` |
| `NEXT_PUBLIC_EVENT_TABLE_TEXTAREA_MAX_LENGTH` | Límite de caracteres para tablas y notas de eventos. | `1000` |

> Todos los valores deben ser enteros positivos. Los límites se leen al cargar la aplicación; si necesitas cambiarlos, actualiza la variable y reinicia el servicio para que el frontend tome el nuevo valor.

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
