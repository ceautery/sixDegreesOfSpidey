drop table if exists "characters";
create table "characters"
(
	id         integer primary key not null,
	name       text,
	img_path   text,
	extension  text
);

drop table if exists "comics";
create table "comics"
(
	id         integer primary key not null,
	title      text,
	img_path   text,
	extension  text
);

drop table if exists "pairings";
create table "pairings"
(
	character  integer,
	comic      integer,
	CONSTRAINT pk PRIMARY KEY (character, comic)
);
