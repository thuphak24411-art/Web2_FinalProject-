import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = typeof localStorage !== 'undefined'
    ? localStorage.getItem('ecocycle_token')
    : null;

  if (!token) {
    return next(req);
  }

  return next(req.clone({
    setHeaders: {
      Authorization: 'Bearer ' + token
    }
  }));
};
