import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Auth } from './auth.component';
import { ForgotPassword } from './pages/forgot-password/forgot-password';
import { LoginPageComponent } from './pages/login/login';
import { Signup } from './pages/signup/signup';

const routes: Routes = [
  {
    path: '',
    component: Auth,
    children: [
      { path: 'login', component: LoginPageComponent },
      { path: 'signup', component: Signup },
      { path: 'forgot-password', component: ForgotPassword },
      { path: '', pathMatch: 'full', redirectTo: 'login' },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}
