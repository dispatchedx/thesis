import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
  });
/* 
http://192.168.222.253:8000
http://localhost:8000
*/
export default api;