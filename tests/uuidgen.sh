uuidgen() {
    local N B T

    for (( N=0; N<16; ++N ))
    do
        B="$( printf '%02x' $(( RANDOM%256 )) )"

        case $N in
            6)  printf '4%s' ${B:1} ;;
            8)  printf '%s%s' $(( ( 0x$B & 0x0f ) | 0x40 )) ${B:1} ;;
            3|5|7|9)
                printf '%s-' $B
            ;;
            *)
                printf '%s' $B
            ;;
        esac
    done

    echo
}

uuidgen