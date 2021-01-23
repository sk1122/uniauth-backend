import { Body, Controller, Get, Inject, Logger, Post, Query, Res, UsePipes, ValidationPipe } from '@nestjs/common';
import { Response } from 'express';
import { IncomingAuthDto, IncomingAuthLoginDto } from './dto/incoming-auth.dto';
import { AccountService } from './account.service';
import { LoginDto } from './dto/login.dto';
import { UserService } from 'src/user/user.service';
import { AuthService } from 'src/auth/auth.service';

@Controller('account')
export class AccountController {
  private readonly logger = new Logger('account');

  constructor(
    private readonly accountService: AccountService,
    @Inject(UserService) private readonly userService: UserService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  /**
   * OAUTH FLOW HANDLERS :: Displayed only when invoded mid-way auth flow
   */

  /**
   * to display login form on client-initiated-auth
   */
  @Get('o/login')
  @UsePipes(
    new ValidationPipe({
      disableErrorMessages: false,
    }),
  )
  async showLoginPageAsAuth(@Res() res: Response, @Query() incomingAuthDto: IncomingAuthDto) {
    const { client_id } = incomingAuthDto;
    try {
      const applicationDetails = await this.accountService.validateAccessRequest(incomingAuthDto);
      return res.render('account/o/login', { app: applicationDetails });
    } catch (e) {
      this.logger.error(`${e.message} for ${client_id}`);
      return res.render('error', e.response);
    }
  }

  /**
   * To handle login form submission on client-initiated-auth
   */
  @Post('o/login')
  @UsePipes(
    new ValidationPipe({
      disableErrorMessages: false,
    }),
  )
  async processLoginPageAsAuth(@Res() res: Response, @Body() incomingAuthDto: IncomingAuthLoginDto) {
    const { client_id } = incomingAuthDto;

    /**
     * validate and get application details from incoming dto
     */
    try {
      const applicationDetails = await this.accountService.validateAccessRequest(incomingAuthDto);

      /**
       * ensure authentication for users
       */
      try {
        const access_token = await this.accountService.authenticateAndGenerateToken(incomingAuthDto);
        res.redirect(`${incomingAuthDto.redirect_uri}/?access_token=${access_token}`);
      } catch (e) {
        /**
         * Render login page with error message from server
         */
        this.logger.error(`${e.message} for ${client_id}`);
        return res.render('account/o/login', { app: applicationDetails, server: { message: e.message } });
      }
    } catch (e) {
      /**
       * Render error page with validation error mesage
       */
      this.logger.error(`POST ${e.message} for ${client_id}`);
      return res.render('error', e.response);
    }
  }

  /**
   * NON OAUTH FLOW HANDLERS :: Normal Operations
   */
  /**
   * to display login page
   */
  @Get('login')
  @UsePipes(
    new ValidationPipe({
      disableErrorMessages: false,
    }),
  )
  async showLoginPage(@Res() res: Response) {
    try {
      return res.render('account/login');
    } catch (e) {
      return res.render('error', e.response);
    }
  }

  @Post('login')
  @UsePipes(ValidationPipe)
  async processLoginPage(@Res() res: Response, @Body() loginDto: LoginDto) {
    try {
      const user = await this.userService.login(loginDto);
      const jwtData = { id: user._id, email: user.collegeEmail };
      const cookieData = await this.authService.generateJwt(jwtData);
      res.cookie('vitAuth', cookieData);
      res.render('profile/homepage', user);
    } catch (e) {
      return res.render('account/login', { server: { message: e.message } });
    }
  }

  /**
   * To show reset password page
   */
  @Get('/password/request')
  async showPasswordRequestPage(@Res() res: Response) {
    try {
      return res.render('password/request');
    } catch (e) {
      return res.render('error', e.response);
    }
  }

  @Get('/password/reset')
  async showPasswordResetPage(@Res() res: Response) {
    try {
      return res.render('password/reset');
    } catch (e) {
      return res.render('error', e.response);
    }
  }

  /**
   * Pages to register a new user into the system
   */
  @Get('/register')
  async showRegisterPage(@Res() res: Response) {
    try {
      return res.render('account/register');
    } catch (e) {
      return res.render('error', e.response);
    }
  }

  /**
   * Page to receive verification callback from email
   */
  @Get('/register/verify')
  async showRegisterSuccessPage(@Res() res: Response) {
    try {
      return res.render('account/register/verify');
    } catch (e) {
      return res.render('error', e.response);
    }
  }

  @Post('/register')
  async processRegisterPage(@Res() res: Response) {
    try {
      return res.render('account/register');
    } catch (e) {
      return res.render('error', e.response);
    }
  }
}