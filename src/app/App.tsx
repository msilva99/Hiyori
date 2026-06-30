import { RouterProvider } from 'react-router';
import { router } from './routes';

export default function App() {
   // Keep App small: routing owns which page is displayed inside the shared layout.
   return <RouterProvider router={router} />;
}
