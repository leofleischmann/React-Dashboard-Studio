import { mountStudio } from './mount';
import DevShell from './DevShell';

const mount = document.getElementById('app');
if (mount) {
  mountStudio(mount, DevShell);
}
