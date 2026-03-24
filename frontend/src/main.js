import './styles/base.css';
import { bootstrapApp } from './app/bootstrap.js';
import { mountShell } from './app/shell.js';

const root = document.querySelector('#app');
void bootstrapApp().then(() => mountShell(root));
