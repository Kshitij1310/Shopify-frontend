import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';

import { AuthRoutingModule } from './auth-routing.module';
import { Auth } from './auth.component';
import { LoginPageComponent } from './pages/login/login';
import { Signup } from './pages/signup/signup';
import { ForgotPassword } from './pages/forgot-password/forgot-password';

@NgModule({
  declarations: [Auth, LoginPageComponent, Signup, ForgotPassword],
  imports: [SharedModule, AuthRoutingModule],
})
export class AuthModule {}
