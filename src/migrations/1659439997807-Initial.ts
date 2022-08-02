import type { MigrationInterface, QueryRunner } from 'typeorm'

export class Initial1659439997807 implements MigrationInterface {
    name = 'Initial.ts1659439997807'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`user\` (\`id\` int NOT NULL AUTO_INCREMENT, \`twistId\` int NOT NULL, \`authToken\` longtext NOT NULL, \`refreshToken\` longtext NULL, \`tokenExpiresAt\` datetime NULL, \`externalUserId\` varchar(255) NOT NULL, \`emailAddress\` varchar(255) NULL, \`name\` varchar(255) NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`,
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`user\``)
    }
}
