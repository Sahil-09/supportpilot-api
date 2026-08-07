import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { JwtService } from '@nestjs/jwt';

// NOTE: Assuming bcrypt is installed successfully.
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  // Inject the PrismaService and JwtService
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { firstName, lastName, email, password } = signUpDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists.');
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create the user
    try {
      const user = await this.prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          password: hashedPassword,
          fullName: `${firstName} ${lastName}`,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
        },
      });

      return {
        message: 'User registered successfully',
        user,
      };
    } catch (error) {
      // Catching potential database errors
      throw new ConflictException('Could not register user');
    }
  }

  async signIn(signInDto: SignInDto): Promise<{ accessToken: string }> {
    const { email, password } = signInDto;

    // Find the user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Generate JWT
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload);

    return { accessToken };
  }

  // Removing placeholder methods: findOne, update, remove
}
