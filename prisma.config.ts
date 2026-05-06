// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
