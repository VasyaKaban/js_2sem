CREATE DATABASE curse;
USE curse;

CREATE TABLE users
(
    login VARCHAR(32) PRIMARY KEY NOT NULL,
    hashed_pwd CHAR(64) NOT NULL,
    is_active BOOL DEFAULT true
);

CREATE TABLE admins
(
    login VARCHAR(32) PRIMARY KEY NOT NULL,
    hashed_pwd CHAR(64) NOT NULL
);

CREATE TABLE auto_marks
(
    mark_name VARCHAR(32) NOT NULL
);

INSERT INTO auto_marks VALUES ('Audi'), ('BMW'), ('Toyota'), ('Mercedes'), ('Ferrari'), ('Opel'), ('Kia'), ('Jeep'), ('Lexus'), ('Nissan'), ('Renault'), ('Tesla'), ('Volvo'), ('Volkswagen'), ('Other');

CREATE TABLE autos
(
    id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    owner_login VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    mark VARCHAR(32) NOT NULL CHECK (mark IN (('Audi'), ('BMW'), ('Toyota'), ('Mercedes'), ('Ferrari'), ('Opel'), ('Kia'), ('Jeep'), ('Lexus'), ('Nissan'), ('Renault'), ('Tesla'), ('Volvo'), ('Volkswagen'), ('Other'))),
    description TEXT NOT NULL,
    picture_path VARCHAR(1024) NOT NULL,
    price FLOAT NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN (('Placed'), ('Sold out')))
);

CREATE TABLE comments
(
    auto_id INT NOT NULL,
    user_login VARCHAR(32) NOT NULL,
    msg VARCHAR(1024) NOT NULL
);

CREATE TABLE pending_autos
(
    id INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    owner_login VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    mark VARCHAR(32) NOT NULL CHECK (mark IN (('Audi'), ('BMW'), ('Toyota'), ('Mercedes'), ('Ferrari'), ('Opel'), ('Kia'), ('Jeep'), ('Lexus'), ('Nissan'), ('Renault'), ('Tesla'), ('Volvo'), ('Volkswagen'), ('Other'))),
    description TEXT NOT NULL,
    picture_path VARCHAR(1024) NOT NULL,
    price FLOAT NOT NULL
);

DELIMITER $$

CREATE PROCEDURE add_user(IN login VARCHAR(32), IN hashed_pwd CHAR(64))
BEGIN
    INSERT INTO users(login, hashed_pwd) VALUES(login, hashed_pwd);
END $$

CREATE PROCEDURE add_admin(IN login VARCHAR(32), IN hashed_pwd CHAR(64))
BEGIN
    INSERT INTO admins(login, hashed_pwd) VALUES(login, hashed_pwd);
END $$

CREATE PROCEDURE add_auto(IN owner_login VARCHAR(32), IN name VARCHAR(255), IN mark VARCHAR(32), IN description TEXT, IN picture_path VARCHAR(1024), IN price FLOAT)
BEGIN
    INSERT INTO autos(owner_login, name, mark, description, picture_path, price, status) VALUES(owner_login, name, mark, description, picture_path, price, 'Placed');
END $$

CREATE PROCEDURE add_comment(IN auto_id INT, IN user_login VARCHAR(32), IN msg VARCHAR(1024))
BEGIN
    INSERT INTO comments(auto_id, user_login, msg) VALUES(auto_id, user_login, msg);
END $$

SET @target_this_id = 0;

CREATE PROCEDURE push_pending_auto(IN owner_login VARCHAR(32), IN name VARCHAR(255), IN mark VARCHAR(32), IN description TEXT, IN price FLOAT, IN ext VARCHAR(16))
BEGIN
    DECLARE this_id INT DEFAULT 0;
    INSERT INTO pending_autos(owner_login, name, mark, description, picture_path, price) VALUES(owner_login, name, mark, description, "", price);
    SELECT id INTO this_id FROM pending_autos WHERE
                                                pending_autos.owner_login = owner_login AND
                                                pending_autos.name = name AND
                                                pending_autos.mark = mark AND
                                                pending_autos.description = description AND
                                                pending_autos.price = price;

    UPDATE pending_autos SET picture_path = CONCAT('pending_pics/', this_id, '.', ext) WHERE id = this_id;

    SET @target_this_id = this_id;

END $$

/*CREATE PROCEDURE add_pending_auto(IN owner_id INT, IN name VARCHAR(255), IN mark VARCHAR(32), IN description TEXT, IN ext VARCHAR(16), IN price FLOAT)
BEGIN
    INSERT INTO pending_autos(owner_id, name, mark, description, picture_path, price) VALUES(owner_id, name, mark, description, '.ext', price);
    UPD
END $$
*/

/*CREATE PROCEDURE pop_pending_and_push_comment(IN input_id INT, IN VARCHAR(16) ext)
BEGIN
    INSERT INTO autos(owner_id, name, mark, description, picture_path, price) SELECT owner_id, name, mark, description, picture_path, price FROM pending_autos WHERE id = input_id;
    UPDATE TABLE autos SET picture_path
END $$
*/

DELIMITER ;


#384557
CALL add_user('user0', '73a584349e7cf0269437d1827334bdd59124d34b9b36249d64e39ba66ec83823');
#amogus
CALL add_user('user1', '80c5e536eec8387cccad28b8b17b933832244998d85918abf18cc9bada5d4fe9');

CALL add_auto('user0', 'm1', 'Audi', 'Very cool car! I like it, but I need to sell it!', 'auto_pics/1.webp', 463.6);
CALL add_auto('user1', 'm2', 'BMW', 'I do not know what to write)', 'auto_pics/2.webp', 3464.3);
CALL add_auto('user0', 'm3', 'Toyota', 'WOW! This site is great!', 'auto_pics/3.webp', 3546.5);

CALL add_comment(1, 'user1', 'Корыто!');

#Петрович
CALL add_admin('Telvit', '3f04b5b9d3daeb43b24242f28e4f69febf3aef6c62c66ef0c320f0953a3da7fe');
