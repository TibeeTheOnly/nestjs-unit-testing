/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from 'src/prisma.service';
import { getClient } from '@pkgverse/prismock';

// & { reset(): Promise<void> } - erre nem lenne szükség hivatalosan,
// de a VS Code nem ismeri fel a prismock típusait...
const mockedClient: PrismaService & { reset(): Promise<void> } = await getClient({
  prismaClient: PrismaService,
  schemaPath: 'prisma/schema.prisma',
});

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    await mockedClient.reset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        // Ahol a NestJS egy PrismaService-t kér, helyette a mockedClient-et adjuk oda
        { provide: PrismaService, useValue: mockedClient },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Egyszerű tesztek, hogy lássuk, hogy működik a mocked client
  describe('findAll()', () => {
    it('should return one item', async () => {
      await mockedClient.user.create({
        data: {
          email: 'user1@example.com',
          banned: false,
        }
      })
      const users = await service.findAll();
      expect(users).toHaveLength(1);
    });

    it('should return an empty list', async () => {
      const users = await service.findAll();
      expect(users).toEqual([]);
    });
  })

  // Valódi tesztek, amely tényleges logikát tesztelnek
  describe('update()', () => {
    it('should change email if not banned', async () => {
      await mockedClient.user.create({
        data: {
          email: 'user1@example.com',
          banned: false,
        }
      })
      const success = await service.update(1, { email: 'changed@example.com' });
      expect(success).toBeTruthy();
      expect(await mockedClient.user.findUnique({
        where: { id: 1 }
      })).toEqual({
        id: 1,
        banned: false,
        email: 'changed@example.com',
      })
    })

    it('should not change email if banned', async () => {
      await mockedClient.user.create({
        data: {
          email: 'user1@example.com',
          banned: true,
        },
      });
      const success = await service.update(1, { email: 'changed@example.com' });
      expect(success).toBeFalsy();
      expect(
        await mockedClient.user.findUnique({
          where: { id: 1 },
        }),
      ).toEqual({
        id: 1,
        banned: true,
        email: 'user1@example.com',
      });
    });
  })
});
