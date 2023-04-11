const express = require("express");
const mariadb = require("mariadb");
const crypto = require("crypto");
const fs = require("fs");

const pool = mariadb.createPool({
  host: "localhost",
  user: "root",
  database: "curse",
  password: "redred384557",
  socketPath: '/var/run/mysqld/mysqld.sock'
});

async function check_user_is_exist(login, pwd, log_in_as_admin)
{
    let conn;
    let hash = crypto.createHash('sha256').update(pwd).digest('hex');
    conn = await pool.getConnection();

    if(log_in_as_admin === 'true')
    {
        console.log("adm!");
        const rows = await conn.query("SELECT * FROM admins WHERE login = '" + login + "' && " + "hashed_pwd = '" + hash +"' LIMIT 1;");
        if(rows.length != 0)
        {
            let res =
            {
                exist: true,
            };
            conn.end();
            return res;
        }
        else
        {
            let res =
            {
                exist: false
            };
            conn.end();
            return res;
        }
    }
    else
    {
        console.log("usr!");
        const rows = await conn.query("SELECT * FROM users WHERE login = '" + login + "' && " + "hashed_pwd = '" + hash +"' LIMIT 1;");
        if(rows.length != 0)
        {
            let res =
            {
                exist: true,
                is_active: rows[0].is_active
            };
            conn.end();
            return res;
        }
        else
        {
            let res =
            {
                exist: false
            };
            conn.end();
            return res;
        }
    }
}

async function create_user_if_not_exist(login, pwd, log_in_as_admin)
{
    let conn;

    let hash = crypto.createHash('sha256').update(pwd).digest('hex');
    conn = await pool.getConnection();
    let res = false;
    if(log_in_as_admin == true)
    {
        const rows = await conn.query("SELECT * FROM admins WHERE login = '" + login +"' LIMIT 1;");
        if(rows.length == 0)
        {
            conn.query("INSERT INTO admins(login, hashed_pwd) VALUES('" + login + "', '" + hash + "');");
            res = true;
        }
    }
    else
    {
        const rows = await conn.query("SELECT * FROM users WHERE login = '" + login +"' LIMIT 1;");
        if(rows.length == 0)
        {
            conn.query("INSERT INTO users(login, hashed_pwd) VALUES('" + login + "', '" + hash + "');");
            res = true;
        }
    }

    conn.end();

    return res;

}

const app = express();
app.use("/", express.static('./site'));
app.set("view engine", "hbs");
//app.use(express.json());
app.use(express.json({limit: '50mb'}));
app.get
    ("/",
        function(request, response)
        {
            response.sendFile(__dirname + "/site/index.html");
        }
    );

app.get
    ("/cars_marks",
        async function(request, response)
        {
            conn = await pool.getConnection();
            const rows = await conn.query("SELECT * FROM auto_marks;");

            let marks_arr = [];
            for(let i = 0; i < rows.length; i++)
            {
                marks_arr.push(rows[i].mark_name);
            }

            response.json(marks_arr);

            conn.end();
        }
    );

app.post
    ("/cars_table",
        async function(request, response)
        {
            /*let params
            {
                name: "",
                marks: [],
                lower_price: 0,
                upper_price: 0,
                sort: "",
                sort_order: ""
            };*/

            console.log(request.body);

            let query_string = "SELECT * FROM autos";
            let restriction_name = "";
            let restriction_mark = "";
            let restriction_price = "";
            let restriction_sort_order = "";

            if(request.body.name != "")
                restriction_name = "(name LIKE '%" + request.body.name + "%')";
            if(request.body.lower_price !== null && request.body.upper_price !== null)
            {
                restriction_price = "(price BETWEEN '" + request.body.lower_price + "' AND '" + request.body.upper_price + "')";
            }

            if(request.body.marks.length != 0)
            {
                restriction_mark = "(mark IN(";

                for(let i = 0; i < request.body.marks.length; i++)
                {
                    if(i == (+request.body.marks.length - 1))
                        restriction_mark += "'" + request.body.marks[i] + "'";
                    else
                        restriction_mark += "'" + request.body.marks[i] + "', ";
                }

                restriction_mark += "))";
            }

            if(request.body.sort.length != 0)
            {
                restriction_sort_order = " ORDER BY " + request.body.sort + " " + request.body.sort_order + "";
            }

            let count_of_restricts = 0;

            if(restriction_name != "")
            {
                count_of_restricts++;
                query_string += " WHERE " + restriction_name;
            }

            if(restriction_mark != "")
            {
                if(count_of_restricts == 0)
                {
                    count_of_restricts++;
                    query_string += " WHERE " + restriction_mark;
                }
                else
                {
                    count_of_restricts++;
                    query_string += " AND " + restriction_mark;
                }
            }

            if(restriction_price != "")
            {
                if(count_of_restricts == 0)
                {
                    count_of_restricts++;
                    query_string += " WHERE " + restriction_price;
                }
                else
                {
                    count_of_restricts++;
                    query_string += " AND " + restriction_price;
                }
            }

            if(restriction_sort_order != "")
            {
                count_of_restricts++;
                query_string += restriction_sort_order;
            }

            query_string += ";";

            console.log(query_string);


            conn = await pool.getConnection();
            const rows = await conn.query(query_string);


            let autos_arr = [];
            for(let i = 0; i < rows.length; i++)
            {
                const auto =
                {
                    id: rows[i].id,
                    owner: rows[i].owner_login,
                    name: rows[i].name,
                    mark: rows[i].mark,
                    description: rows[i].description,
                    picture_path: rows[i].picture_path,
                    price: rows[i].price,
                    status: rows[i].status
                };

                autos_arr.push(auto);
            }

            response.json(autos_arr);

            conn.end();
        }
    );


app.post
    ("/admin_panel/users/:login",
        async function(request, response)
        {
            conn = await pool.getConnection();
            const rows = await conn.query("SELECT * FROM users WHERE login = '" + request.params["login"] + "' LIMIT 1;");
            if(rows.length == 0)
            {
                response.json(false);
            }
            else
            {
                let state = 0;
                if(rows[0].is_active == 0)
                    state = 1;

                await conn.query("UPDATE users SET is_active = '" + state + "' WHERE login = '" + request.params["login"] + "';");
                response.json(true);
            }
            conn.end();
        }
    );


app.get
    ("/about",
        function(request, response)
        {
            response.render("about.hbs");
        }
    );

app.get
    ("/log_in",
        function(request, response)
        {
            response.sendFile(__dirname + "/site/log_in.html");
        }
    );

app.post
    ("/log_in",
        async function(request, response)
        {
            console.log(request.body);
            let res = await check_user_is_exist(request.body.login, request.body.pwd, request.body.log_in_as_admin);
            response.json(res);


        }
    );

app.get
    ("/register",
        function(request, response)
        {
            response.sendFile(__dirname + "/site/register.html");
        }
    );

app.post
    ("/register",
        async function(request, response)
        {
            let res = await create_user_if_not_exist(request.body.login, request.body.pwd, request.body.log_in_as_admin);
            response.json(res);
        }
    );


app.get
    ("/cars/:car_id",
        async function(request, response)
        {
            conn = await pool.getConnection();
            const rows = await conn.query("SELECT * FROM autos WHERE id = " + request.params["car_id"] + ";");
            if(rows.length == 0)
            {
                response.status(404);
                response.type('txt').send('Not found');
            }
            else
            {
                //let owner = await conn.query("SELECT * FROM users WHERE login = '" + rows[0].owner_login + "';");
                const comments_rows = await conn.query("SELECT users.login AS author, comments.msg AS msg FROM comments INNER JOIN users ON users.login = comments.user_login WHERE auto_id = " + request.params["car_id"] + ";");
                let comments = [];
                for(var i = 0; i < comments_rows.length; i++)
                {
                    var comm =
                    {
                        author: comments_rows[i].author,
                        msg: comments_rows[i].msg
                    };

                    comments[i] = comm;
                }
                response.render("product_page.hbs",
                {
                    auto_id: rows[0].id,

                    name: rows[0].name,
                    owner: rows[0].owner_login,
                    mark: rows[0].mark,
                    price: rows[0].price,
                    picture_path: "../" + rows[0].picture_path,
                    description: rows[0].description,

                    comments: comments
                });
            }
            conn.end();
        }
    );


app.post
    ("/cars/:car_id",
        async function(request, response)
        {
            conn = await pool.getConnection();

            var rows = await conn.query("SELECT * FROM users WHERE login = '" + request.body.user + "';");

            const comment_data =
            {
                auto_id: request.params["car_id"],
                user_login: rows[0].login,
                msg: request.body.msg
            };

            await conn.query("CALL add_comment('" + comment_data.auto_id +"', '" + comment_data.user_login + "', '" + comment_data.msg + "');");

            response.json(true);
        }
    );


app.get
    ("/create_ad",
        async function(request, response)
        {
            conn = await pool.getConnection();
            const rows = await conn.query("SELECT * FROM auto_marks;");

            let arr = [];
            for(let i = 0; i < rows.length; i++)
            {
                arr[i] = rows[i].mark_name;
            }

            response.render("create_product.hbs",
            {
                autos: arr
            });

            conn.end();
        }
    );

app.post
    ("/create_ad",
        async function(request, response)
        {
            conn = await pool.getConnection();

            await conn.query("CALL push_pending_auto('" + request.body.owner + "', '" + request.body.auto_name + "', '" + request.body.auto_mark + "', '" + request.body.auto_description + "', " + request.body.auto_price + ", '" +  request.body.auto_picture_ext + "');");

            let this_id = await conn.query("SELECT @target_this_id AS id;");


            var base64Data = request.body.auto_picture.split('base64,')[1];
            var buf = Buffer.from(base64Data, 'base64');

            let writeStream = fs.createWriteStream(__dirname + '/site/pending_pics/' + this_id[0].id + '.' + request.body.auto_picture_ext);
            writeStream.write(buf);
            writeStream.end();

            /*fs.writeFile(__dirname + '/site/pending_pics/' + this_id[0].id + '.' + request.body.auto_picture_ext, request.body.auto_picture.split('base64,')[1], (err) =>
            {
                if (err) throw err;
            });*/


            response.json(true);
        }
    );

    app.get
    ("/profile/:login",
        async function(request, response)
        {
            conn = await pool.getConnection();
            const user_exist = await conn.query("SELECT * FROM users WHERE login = '" + request.params["login"] + "';");
            if(user_exist.length == 0)
            {
                response.status(404);
                response.type('txt').send('Not found');
            }
            else
                response.sendFile(__dirname + "/site/profile.html");
        }
    );

app.post
    ("/profile/:login",
        async function(request, response)
        {
            conn = await pool.getConnection();
            const user_exist = await conn.query("SELECT * FROM users WHERE login = '" + request.params["login"] + "';");
            if(user_exist.length == 0)
            {
                response.status(404);
                response.type('txt').send('Not found');
            }
            else
            {
                const autos = await conn.query("SELECT * FROM autos WHERE owner_login = '" + request.params["login"] + "';");
                const pending_autos = await conn.query("SELECT * FROM pending_autos WHERE owner_login = '" + request.params["login"] + "';");


                let autos_arr = [];
                let pending_autos_arr = [];
                for(let i = 0; i < autos.length; i++)
                {
                    const item =
                    {
                        id: autos[i].id,
                        name: autos[i].name,
                        mark: autos[i].mark,
                        description: autos[i].description,
                        picture_path: "../" + autos[i].picture_path,
                        price: autos[i].price,
                        status: autos[i].status
                    };

                    autos_arr.push(item);
                }

                for(let i = 0; i < pending_autos.length; i++)
                {
                    const item =
                    {
                        id: pending_autos[i].id,
                        name: pending_autos[i].name,
                        mark: pending_autos[i].mark,
                        description: pending_autos[i].description,
                        picture_path: "../" + pending_autos[i].picture_path,
                        price: pending_autos[i].price,
                    };

                    pending_autos_arr.push(item);
                }

                conn.end();

                const out_data =
                {
                    active: autos_arr,
                    pending: pending_autos_arr
                };

                response.json(out_data);
            }
        }
    );

app.get
    ("/admin_panel",
        function(request, response)
        {
            response.sendFile(__dirname + "/site/admin_panel.html");
        }
    );

    app.get
    ("/admin_panel/:type",
        async function(request, response)
        {
            conn = await pool.getConnection();

            if(request.params["type"] == "users")
            {
                const users = await conn.query("SELECT * FROM users;");

                let users_arr = [];
                for(let i = 0; i < users.length; i++)
                {
                    const user_data =
                    {
                        login: users[i].login,
                        status: (users[i].is_active ? "Active" : "Blocked")
                    };

                    users_arr.push(user_data);
                }

                console.log(users_arr);

                response.json(users_arr);
            }
            else if(request.params["type"] == "autos")
            {
                const autos = await conn.query("SELECT * FROM autos;");

                let autos_arr = [];

                for(let i = 0; i < autos.length; i++)
                {
                    const auto_data =
                    {
                        id: autos[i].id,
                        owner: autos[i].owner_login,
                        name: autos[i].name,
                        mark: autos[i].mark,
                        description: autos[i].description,
                        picture_path: autos[i].picture_path,
                        price: autos[i].price,
                        status: autos[i].status
                    };

                    autos_arr.push(auto_data);
                }

                response.json(autos_arr);
            }
            else if(request.params["type"] == "pending_autos")
            {
                const autos = await conn.query("SELECT * FROM pending_autos;");

                let autos_arr = [];

                for(let i = 0; i < autos.length; i++)
                {
                    const auto_data =
                    {
                        id: autos[i].id,
                        owner: autos[i].owner_login,
                        name: autos[i].name,
                        mark: autos[i].mark,
                        description: autos[i].description,
                        picture_path: autos[i].picture_path,
                        price: autos[i].price,
                    };

                    autos_arr.push(auto_data);
                }

                response.json(autos_arr);
            }

            conn.end();
        }
    );

app.post
    ("/admin_panel/pending_autos",
        async function(request, response)
        {
            let res = false;
            conn = await pool.getConnection();

            let query_string = "WHERE id IN(";
            for(let i = 0; i < request.body.ids.length; i++)
            {
                query_string += request.body.ids[i];
                if(i == (+request.body.ids.length - 1))
                {
                    query_string += ");";
                }
                else
                {
                    query_string += ", ";
                }
            }
            const rows = await conn.query("SELECT * FROM pending_autos " + query_string);

            if(request.body.type === 'delete')
            {
                for(let i = 0; i < rows.length; i++)
                    fs.unlink(__dirname + "/site/" + rows[i].picture_path, function() {});

                await conn.query("DELETE FROM pending_autos " + query_string);
                res = true;

            }
            else if(request.body.type === 'activate')
            {
                let query_insert = "";
                for(let i = 0; i < rows.length; i++)
                {
                    query_insert += "(" +
                                    "'" + rows[i].owner_login + "', " +
                                    "'" + rows[i].name + "', " +
                                    "'" + rows[i].mark + "', " +
                                    "'" + rows[i].description + "', " +
                                    "'" + rows[i].picture_path + "', " +
                                    "'" + rows[i].price + "', " +
                                    "'Placed')";

                    if(i != (+rows.length - 1))
                        query_insert += ", ";
                }

                console.log(query_insert);


                await conn.query("INSERT INTO autos(owner_login, name, mark, description, picture_path, price, status) VALUES " + query_insert + ";");

                const selected_new = await conn.query("SELECT id, picture_path FROM autos ORDER BY id DESC limit " + rows.length + ";");

                for(let i = 0; i < selected_new.length; i++)
                {
                    let ext = selected_new[i].picture_path.split('.')[1];
                    let new_pic_path = "auto_pics/" + selected_new[i].id + "." + ext;
                    await conn.query("UPDATE autos SET picture_path = '" + new_pic_path + "' WHERE id = '" + selected_new[i].id + "';");
                    fs.rename(__dirname + "/site/" + selected_new[i].picture_path, __dirname + "/site/" + new_pic_path, function() {});
                }

                res = true;

                await conn.query("DELETE FROM pending_autos " + query_string);
            }
            conn.end();
            response.json(res);

        }
    );


app.listen(3000);
